(() => {
  'use strict';

  const config = window.CRM_CONFIG || {};
  const workspaceId = config.workspaceId;
  const client = window.supabase && config.supabaseUrl && config.supabasePublishableKey
    ? window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
    : null;

  let user = null;
  let workspaceVersion = 0;
  let saveTimer = 0;
  let channel = null;
  let remoteReady = false;
  let stateListener = null;
  let statusListener = null;

  const emitStatus = status => {
    if (statusListener) statusListener(status);
  };

  async function session() {
    if (!client) return null;
    const { data } = await client.auth.getSession();
    return data.session || null;
  }

  async function connect(seedData) {
    if (!client || !workspaceId) {
      emitStatus({ mode: 'local', message: 'Supabase configuration required' });
      return { mode: 'local', data: seedData };
    }
    const currentSession = await session();
    user = currentSession?.user || null;
    if (!user) {
      emitStatus({ mode: 'signed-out', message: 'Sign in to save and share contacts' });
      return { mode: 'signed-out', data: seedData };
    }

    const claim = await client.rpc('crm_claim_workspace', { target_workspace_id: workspaceId });
    if (claim.error) {
      const setupRequired = /crm_claim_workspace|schema cache|function/i.test(claim.error.message || '');
      const status = {
        mode: setupRequired ? 'setup-required' : 'error',
        message: setupRequired ? 'CRM database setup required' : claim.error.message,
        user
      };
      emitStatus(status);
      return { ...status, data: seedData };
    }
    if (!claim.data) {
      const denied = { mode: 'access-denied', message: 'This account has not been given CRM access', user };
      emitStatus(denied);
      return { ...denied, data: seedData };
    }

    const existing = await client.from('crm_workspace_state')
      .select('data,version')
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    if (existing.error) {
      const failure = { mode: 'error', message: existing.error.message, user };
      emitStatus(failure);
      return { ...failure, data: seedData };
    }

    let data = existing.data?.data;
    workspaceVersion = Number(existing.data?.version || 0);
    if (!data || !Object.keys(data).length) {
      const created = await client.from('crm_workspace_state').insert({
        workspace_id: workspaceId,
        data: seedData,
        version: 1,
        updated_by: user.id
      }).select('version').single();
      if (created.error && created.error.code !== '23505') {
        const failure = { mode: 'error', message: created.error.message, user };
        emitStatus(failure);
        return { ...failure, data: seedData };
      }
      workspaceVersion = Number(created.data?.version || 1);
      data = seedData;
    }

    remoteReady = true;
    subscribe();
    const connected = {
      mode: 'connected',
      message: 'Saved securely and shared',
      user,
      role: claim.data,
      version: workspaceVersion
    };
    emitStatus(connected);
    return { ...connected, data };
  }

  function subscribe() {
    if (!client || !workspaceId) return;
    if (channel) client.removeChannel(channel);
    channel = client.channel('crm-workspace')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'crm_workspace_state',
        filter: `workspace_id=eq.${workspaceId}`
      }, payload => {
        if (!payload.new?.data) return;
        workspaceVersion = Number(payload.new.version || workspaceVersion);
        if (stateListener) stateListener(payload.new.data);
      })
      .subscribe();
  }

  async function push(data) {
    if (!client || !user || !remoteReady) return;
    const nextVersion = workspaceVersion + 1;
    const result = await client.from('crm_workspace_state')
      .update({
        data,
        version: nextVersion,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('workspace_id', workspaceId)
      .eq('version', workspaceVersion)
      .select('version')
      .maybeSingle();
    if (result.error) {
      emitStatus({ mode: 'error', message: result.error.message, user });
      return false;
    }
    if (!result.data) {
      emitStatus({ mode: 'conflict', message: 'A newer CRM change is available; refreshing shared data', user });
      const latest = await client.from('crm_workspace_state')
        .select('data,version')
        .eq('workspace_id', workspaceId)
        .single();
      if (latest.data) {
        workspaceVersion = Number(latest.data.version);
        if (stateListener) stateListener(latest.data.data);
      }
      return false;
    }
    workspaceVersion = Number(result.data.version || nextVersion);
    emitStatus({ mode: 'connected', message: 'All changes saved', user, version: workspaceVersion });
    return true;
  }

  function scheduleSave(data) {
    if (!remoteReady) return;
    clearTimeout(saveTimer);
    const snapshot = structuredClone(data);
    saveTimer = setTimeout(() => push(snapshot), 350);
  }

  async function signIn(email, password) {
    if (!client) throw new Error('Supabase is not configured.');
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    if (!client) return;
    await client.auth.signOut();
    user = null;
    remoteReady = false;
    if (channel) client.removeChannel(channel);
    emitStatus({ mode: 'signed-out', message: 'Signed out; local preview only' });
  }

  async function resetPassword(email) {
    if (!client) throw new Error('Supabase is not configured.');
    const redirectTo = window.location.protocol === 'file:'
      ? undefined
      : `${window.location.origin}${window.location.pathname}`;
    const { error } = await client.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
    if (error) throw error;
  }

  async function listBackups(limit = 10) {
    if (!client || !user || !remoteReady) return [];
    const { data, error } = await client.from('crm_workspace_backups')
      .select('id,source_version,reason,created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  }

  async function createBackup(data, reason = 'manual restore point') {
    if (!client || !user || !remoteReady) throw new Error('Connect the shared CRM first.');
    const { error } = await client.from('crm_workspace_backups').insert({
      workspace_id: workspaceId,
      source_version: workspaceVersion,
      snapshot: data,
      reason,
      created_by: user.id
    });
    if (error) throw error;
  }

  async function restoreBackup(id) {
    if (!client || !user || !remoteReady) throw new Error('Connect the shared CRM first.');
    const { data, error } = await client.from('crm_workspace_backups')
      .select('snapshot')
      .eq('workspace_id', workspaceId)
      .eq('id', id)
      .single();
    if (error) throw error;
    const restored = data?.snapshot;
    if (!restored) throw new Error('That restore point is no longer available.');
    const saved = await push(restored);
    if (!saved) throw new Error('The restore point could not be applied because newer data is available.');
    return restored;
  }

  function onAuthStateChange(callback) {
    if (!client) return;
    client.auth.onAuthStateChange((event, nextSession) => callback(event, nextSession));
  }

  window.WorkgroupCrmData = Object.freeze({
    isConfigured: () => Boolean(client && workspaceId),
    connect,
    scheduleSave,
    signIn,
    signOut,
    resetPassword,
    listBackups,
    createBackup,
    restoreBackup,
    session,
    onStateChange: callback => { stateListener = callback; },
    onStatusChange: callback => { statusListener = callback; },
    onAuthStateChange
  });
})();
