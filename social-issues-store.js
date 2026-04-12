(function () {
  const LOCAL_STORAGE_KEY = "gd4-social-issues-fallback";
  const DEFAULT_LIMIT = 28;
  const globalConfig = window.SOCIAL_ISSUES_CONFIG || {};

  let mode = "local";
  let client = null;
  let initialized = false;

  function normalizeTerm(term) {
    return term.trim().replace(/\s+/g, " ").toLowerCase();
  }

  function readLocalIssues() {
    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeLocalIssues(issues) {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(issues));
  }

  async function init() {
    if (initialized) return mode;
    initialized = true;

    const hasRemoteConfig = Boolean(globalConfig.supabaseUrl && globalConfig.supabaseAnonKey);
    if (hasRemoteConfig && window.supabase && typeof window.supabase.createClient === "function") {
      client = window.supabase.createClient(globalConfig.supabaseUrl, globalConfig.supabaseAnonKey);
      mode = "supabase";
      return mode;
    }

    mode = "local";
    return mode;
  }

  async function listIssues(limit = DEFAULT_LIMIT) {
    await init();

    if (mode === "supabase" && client) {
      const { data, error } = await client
        .from(globalConfig.tableName || "social_issues")
        .select("id, term, normalized_term, count, updated_at")
        .order("count", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(limit);

      if (!error && Array.isArray(data)) {
        return data;
      }
    }

    return readLocalIssues()
      .sort((a, b) => {
        if ((b.count || 0) !== (a.count || 0)) return (b.count || 0) - (a.count || 0);
        return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
      })
      .slice(0, limit);
  }

  async function submitIssue(term) {
    await init();

    const cleaned = term.trim().replace(/\s+/g, " ");
    const normalized = normalizeTerm(cleaned);
    if (!normalized) return null;

    if (mode === "supabase" && client) {
      const tableName = globalConfig.tableName || "social_issues";
      const { data: existing, error: fetchError } = await client
        .from(tableName)
        .select("id, term, normalized_term, count")
        .eq("normalized_term", normalized)
        .maybeSingle();

      if (!fetchError && existing) {
        const { data: updated, error: updateError } = await client
          .from(tableName)
          .update({
            term: cleaned,
            count: (existing.count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq("id", existing.id)
          .select("id, term, normalized_term, count, updated_at")
          .single();

        if (!updateError && updated) return updated;
      }

      if (!fetchError && !existing) {
        const { data: inserted, error: insertError } = await client
          .from(tableName)
          .insert({
            term: cleaned,
            normalized_term: normalized,
            count: 1
          })
          .select("id, term, normalized_term, count, updated_at")
          .single();

        if (!insertError && inserted) return inserted;
      }
    }

    const issues = readLocalIssues();
    const existingIndex = issues.findIndex((issue) => issue.normalized_term === normalized);
    const nextTimestamp = new Date().toISOString();

    if (existingIndex >= 0) {
      issues[existingIndex] = {
        ...issues[existingIndex],
        term: cleaned,
        count: (issues[existingIndex].count || 0) + 1,
        updated_at: nextTimestamp
      };
      writeLocalIssues(issues);
      return issues[existingIndex];
    }

    const freshIssue = {
      id: normalized,
      term: cleaned,
      normalized_term: normalized,
      count: 1,
      updated_at: nextTimestamp
    };
    issues.push(freshIssue);
    writeLocalIssues(issues);
    return freshIssue;
  }

  window.socialIssuesStore = {
    init,
    listIssues,
    submitIssue,
    normalizeTerm,
    getMode: () => mode
  };
})();
