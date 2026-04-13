(function () {
  const LOCAL_STORAGE_KEY = "gd4-social-issues-fallback";
  const DEFAULT_LIMIT = 28;
  const globalConfig = window.SOCIAL_ISSUES_CONFIG || {};

  let mode = "local";
  let client = null;
  let initialized = false;
  let supportsYearlyCounts = null;
  const resetAfterMs = globalConfig.resetAfter ? new Date(globalConfig.resetAfter).getTime() : null;

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

  function currentYearKey() {
    return String(new Date().getFullYear());
  }

  function isAfterReset(issue) {
    if (!Number.isFinite(resetAfterMs)) return true;
    const updatedAt = new Date(issue.updated_at || issue.created_at || 0).getTime();
    return Number.isFinite(updatedAt) && updatedAt >= resetAfterMs;
  }

  function normalizeYearlyCounts(issue) {
    const fallbackYear = new Date(issue.updated_at || issue.created_at || Date.now()).getFullYear();
    const raw = issue.yearly_counts;

    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      return raw;
    }

    return {
      [String(fallbackYear)]: issue.count || 1
    };
  }

  function buildTopIssuesByYear(issues, limitPerYear = 3) {
    const grouped = new Map();

    issues.forEach((issue) => {
      const yearlyCounts = normalizeYearlyCounts(issue);
      Object.entries(yearlyCounts).forEach(([year, count]) => {
        const numericCount = Number(count) || 0;
        if (numericCount <= 0) return;
        if (!grouped.has(year)) grouped.set(year, []);
        grouped.get(year).push({
          term: issue.term,
          count: numericCount
        });
      });
    });

    return Array.from(grouped.entries())
      .map(([year, entries]) => ({
        year,
        topIssues: entries
          .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term))
          .slice(0, limitPerYear)
      }))
      .sort((a, b) => Number(b.year) - Number(a.year));
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
      const tableName = globalConfig.tableName || "social_issues";
      const selectColumns = supportsYearlyCounts === false
        ? "id, term, normalized_term, count, updated_at"
        : "id, term, normalized_term, count, updated_at, yearly_counts";

      const { data, error } = await client
        .from(tableName)
        .select(selectColumns)
        .order("count", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(limit);

      if (!error && Array.isArray(data)) {
        if (supportsYearlyCounts === null) supportsYearlyCounts = true;
        return data
          .filter(isAfterReset)
          .map((issue) => ({
            ...issue,
            yearly_counts: normalizeYearlyCounts(issue)
          }));
      }

      if (error && supportsYearlyCounts !== false) {
        supportsYearlyCounts = false;
        return listIssues(limit);
      }
    }

    return readLocalIssues()
      .filter(isAfterReset)
      .sort((a, b) => {
        if ((b.count || 0) !== (a.count || 0)) return (b.count || 0) - (a.count || 0);
        return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
      })
      .map((issue) => ({
        ...issue,
        yearly_counts: normalizeYearlyCounts(issue)
      }))
      .slice(0, limit);
  }

  async function submitIssue(term) {
    await init();

    const cleaned = term.trim().replace(/\s+/g, " ");
    const normalized = normalizeTerm(cleaned);
    if (!normalized) return null;

    if (mode === "supabase" && client) {
      const tableName = globalConfig.tableName || "social_issues";
      const selectColumns = supportsYearlyCounts === false
        ? "id, term, normalized_term, count, updated_at"
        : "id, term, normalized_term, count, updated_at, yearly_counts";
      const { data: existing, error: fetchError } = await client
        .from(tableName)
        .select(selectColumns)
        .eq("normalized_term", normalized)
        .maybeSingle();

      if (!fetchError && existing) {
        if (!isAfterReset(existing)) {
          const yearKey = currentYearKey();
          const resetPayload = {
            term: cleaned,
            count: 1,
            updated_at: new Date().toISOString()
          };
          if (supportsYearlyCounts !== false) {
            resetPayload.yearly_counts = { [yearKey]: 1 };
          }

          const { data: resetIssue, error: resetError } = await client
            .from(tableName)
            .update(resetPayload)
            .eq("id", existing.id)
            .select(selectColumns)
            .single();

          if (!resetError && resetIssue) {
            if (supportsYearlyCounts === null) supportsYearlyCounts = true;
            return {
              ...resetIssue,
              yearly_counts: resetPayload.yearly_counts || normalizeYearlyCounts(resetIssue)
            };
          }

          if (resetError && supportsYearlyCounts !== false) {
            supportsYearlyCounts = false;
            return submitIssue(term);
          }
        }

        const yearlyCounts = normalizeYearlyCounts(existing);
        const yearKey = currentYearKey();
        const nextYearlyCounts = {
          ...yearlyCounts,
          [yearKey]: (Number(yearlyCounts[yearKey]) || 0) + 1
        };
        const updatePayload = {
          term: cleaned,
          count: (existing.count || 0) + 1,
          updated_at: new Date().toISOString()
        };
        if (supportsYearlyCounts !== false) {
          updatePayload.yearly_counts = nextYearlyCounts;
        }

        const { data: updated, error: updateError } = await client
          .from(tableName)
          .update(updatePayload)
          .eq("id", existing.id)
          .select(selectColumns)
          .single();

        if (!updateError && updated) {
          if (supportsYearlyCounts === null) supportsYearlyCounts = true;
          return {
            ...updated,
            yearly_counts: nextYearlyCounts
          };
        }

        if (updateError && supportsYearlyCounts !== false) {
          supportsYearlyCounts = false;
          return submitIssue(term);
        }
      }

      if (!fetchError && !existing) {
        const yearKey = currentYearKey();
        const insertPayload = {
          term: cleaned,
          normalized_term: normalized,
          count: 1
        };
        if (supportsYearlyCounts !== false) {
          insertPayload.yearly_counts = { [yearKey]: 1 };
        }

        const { data: inserted, error: insertError } = await client
          .from(tableName)
          .insert(insertPayload)
          .select(selectColumns)
          .single();

        if (!insertError && inserted) {
          if (supportsYearlyCounts === null) supportsYearlyCounts = true;
          return {
            ...inserted,
            yearly_counts: insertPayload.yearly_counts || normalizeYearlyCounts(inserted)
          };
        }

        if (insertError && supportsYearlyCounts !== false) {
          supportsYearlyCounts = false;
          return submitIssue(term);
        }
      }

      if (fetchError && supportsYearlyCounts !== false) {
        supportsYearlyCounts = false;
        return submitIssue(term);
      }
    }

    const issues = readLocalIssues();
    const existingIndex = issues.findIndex((issue) => issue.normalized_term === normalized && isAfterReset(issue));
    const nextTimestamp = new Date().toISOString();
    const yearKey = currentYearKey();

    if (existingIndex >= 0) {
      const existingYearlyCounts = normalizeYearlyCounts(issues[existingIndex]);
      issues[existingIndex] = {
        ...issues[existingIndex],
        term: cleaned,
        count: (issues[existingIndex].count || 0) + 1,
        updated_at: nextTimestamp,
        yearly_counts: {
          ...existingYearlyCounts,
          [yearKey]: (Number(existingYearlyCounts[yearKey]) || 0) + 1
        }
      };
      writeLocalIssues(issues);
      return issues[existingIndex];
    }

    const freshIssue = {
      id: normalized,
      term: cleaned,
      normalized_term: normalized,
      count: 1,
      updated_at: nextTimestamp,
      yearly_counts: { [yearKey]: 1 }
    };
    issues.push(freshIssue);
    writeLocalIssues(issues);
    return freshIssue;
  }

  async function getTopIssuesByYear(limitPerYear = 3) {
    const issues = await listIssues(500);
    return buildTopIssuesByYear(issues, limitPerYear);
  }

  window.socialIssuesStore = {
    init,
    listIssues,
    submitIssue,
    getTopIssuesByYear,
    normalizeTerm,
    getMode: () => mode
  };
})();
