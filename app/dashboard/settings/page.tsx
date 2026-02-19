'use client';

import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useAuth } from '../../components/AuthProvider';
import { DashboardNav } from '../../components/DashboardNav';
import { hasAccess } from '@/lib/plan-gates';

type SettingsTab = 'webhooks' | 'api' | 'slack' | 'team' | 'contracts' | 'audit';

interface Webhook {
  id: string;
  url: string;
  events_filter: string;
  active: boolean;
  created_at: string;
  secret?: string;
}

interface Delivery {
  id: string;
  status_code: number;
  response_body: string;
  attempted_at: string;
}

interface ApiKey {
  id: string;
  name: string;
  last_used_at: string | null;
  created_at: string;
  rawKey?: string;
}

interface SlackConfig {
  webhook_url: string;
  channel: string;
  severity_filter: string[];
}

interface SlackIntegration {
  id: string;
  config_json: SlackConfig;
  active: boolean;
  created_at: string;
}

interface TeamMember {
  id: string;
  user_id: string | null;
  email: string;
  role: string;
  status: string;
  invited_at: string;
  joined_at: string | null;
}

interface AlertRoute {
  id: string;
  email: string;
  severity_filter: string;
  vendor_filter: string;
  active: boolean;
  created_at: string;
}

interface VendorContract {
  id: string;
  vendor_id: string;
  contract_renewal_date: string;
  notice_period_days: number;
  contract_value: string | null;
  notes: string | null;
  auto_renews: boolean;
  reminder_sent: boolean;
  created_at: string;
  vendors: { name: string } | { name: string }[] | null;
}

interface AuditEntry {
  id: string;
  action: string;
  detail: string | null;
  ip_address: string | null;
  created_at: string;
}

const TAB_CONFIG: { id: SettingsTab; label: string; requiredPlan: string }[] = [
  { id: 'webhooks', label: 'Webhooks', requiredPlan: 'pro' },
  { id: 'api', label: 'API Keys', requiredPlan: 'pro' },
  { id: 'slack', label: 'Slack', requiredPlan: 'pro' },
  { id: 'team', label: 'Team', requiredPlan: 'business' },
  { id: 'contracts', label: 'Contracts', requiredPlan: 'business' },
  { id: 'audit', label: 'Audit Log', requiredPlan: 'business' },
];

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [plan, setPlan] = useState<string>('free');
  const [planLoading, setPlanLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<SettingsTab>('webhooks');

  // Webhook state
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [newFilter, setNewFilter] = useState('all');
  const [whLoading, setWhLoading] = useState(false);
  const [whError, setWhError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, string>>({});
  const [deliveries, setDeliveries] = useState<Record<string, Delivery[]>>({});
  const [showDeliveries, setShowDeliveries] = useState<string | null>(null);

  // API key state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyRaw, setNewKeyRaw] = useState<string | null>(null);
  const [keyLoading, setKeyLoading] = useState(false);

  // Slack state
  const [slackIntegration, setSlackIntegration] = useState<SlackIntegration | null>(null);
  const [slackUrl, setSlackUrl] = useState('');
  const [slackChannel, setSlackChannel] = useState('');
  const [slackFilters, setSlackFilters] = useState<string[]>(['critical', 'warning', 'notice']);
  const [slackActive, setSlackActive] = useState(true);
  const [slackLoading, setSlackLoading] = useState(false);
  const [slackTestResult, setSlackTestResult] = useState<string | null>(null);

  // Team state
  const [team, setTeam] = useState<{ id: string; name: string } | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamRole, setTeamRole] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [teamName, setTeamName] = useState('');

  // Alert route state
  const [alertRoutes, setAlertRoutes] = useState<AlertRoute[]>([]);
  const [newRouteEmail, setNewRouteEmail] = useState('');
  const [newRouteSeverity, setNewRouteSeverity] = useState('all');
  const [newRouteVendor, setNewRouteVendor] = useState('all');
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // Contract state
  const [contracts, setContracts] = useState<VendorContract[]>([]);
  const [contractVendorId, setContractVendorId] = useState('');
  const [contractDate, setContractDate] = useState('');
  const [contractNotice, setContractNotice] = useState('30');
  const [contractValue, setContractValue] = useState('');
  const [contractNotes, setContractNotes] = useState('');
  const [contractAutoRenews, setContractAutoRenews] = useState(true);
  const [contractLoading, setContractLoading] = useState(false);
  const [contractError, setContractError] = useState<string | null>(null);
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);

  // Audit state
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilter, setAuditFilter] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Fetch plan
  useEffect(() => {
    if (authLoading || !user) return;
    supabase
      .from('user_profiles')
      .select('plan')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setPlan(data?.plan || 'free');
        setPlanLoading(false);
      });
  }, [user, authLoading, supabase]);

  const hasPro = hasAccess(plan, 'pro');
  const hasBusiness = hasAccess(plan, 'business');

  // Fetch webhooks
  const fetchWebhooks = useCallback(async () => {
    if (!hasPro) return;
    const res = await fetch('/api/webhooks');
    const data = await res.json();
    if (res.ok) setWebhooks(data.webhooks);
  }, [hasPro]);

  // Fetch API keys
  const fetchApiKeys = useCallback(async () => {
    if (!hasPro) return;
    const res = await fetch('/api/api-keys');
    const data = await res.json();
    if (res.ok) setApiKeys(data.keys);
  }, [hasPro]);

  // Fetch Slack integration
  const fetchSlack = useCallback(async () => {
    if (!hasPro) return;
    const res = await fetch('/api/integrations/slack');
    const data = await res.json();
    if (res.ok && data.integration) {
      setSlackIntegration(data.integration);
      const config = data.integration.config_json as SlackConfig;
      setSlackUrl(config.webhook_url || '');
      setSlackChannel(config.channel || '');
      setSlackFilters(config.severity_filter || ['critical', 'warning', 'notice']);
      setSlackActive(data.integration.active);
    }
  }, [hasPro]);

  // Fetch team
  const fetchTeam = useCallback(async () => {
    if (!hasBusiness) return;
    const res = await fetch('/api/teams');
    const data = await res.json();
    if (res.ok) {
      setTeam(data.team);
      setTeamMembers(data.members ?? []);
      setTeamRole(data.role);
    }
  }, [hasBusiness]);

  // Fetch alert routes
  const fetchAlertRoutes = useCallback(async () => {
    if (!hasBusiness) return;
    const res = await fetch('/api/teams/alert-routes');
    const data = await res.json();
    if (res.ok) setAlertRoutes(data.routes ?? []);
  }, [hasBusiness]);

  // Fetch contracts
  const fetchContracts = useCallback(async () => {
    if (!hasBusiness) return;
    const res = await fetch('/api/vendor-contracts');
    const data = await res.json();
    if (res.ok) setContracts(data.contracts ?? []);
  }, [hasBusiness]);

  // Fetch vendor list for contract dropdown
  const fetchVendors = useCallback(async () => {
    if (!hasBusiness) return;
    const { data } = await supabase
      .from('vendors')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    setVendors(data ?? []);
  }, [hasBusiness, supabase]);

  // Fetch audit log
  const fetchAudit = useCallback(async () => {
    if (!hasBusiness) return;
    setAuditLoading(true);
    const params = new URLSearchParams({ page: String(auditPage) });
    if (auditFilter) params.set('action', auditFilter);
    const res = await fetch(`/api/audit?${params}`);
    const data = await res.json();
    if (res.ok) {
      setAuditEntries(data.entries);
      setAuditTotalPages(data.totalPages);
    }
    setAuditLoading(false);
  }, [hasBusiness, auditPage, auditFilter]);

  useEffect(() => {
    fetchWebhooks();
    fetchApiKeys();
    fetchSlack();
    fetchTeam();
    fetchAlertRoutes();
    fetchContracts();
    fetchVendors();
  }, [fetchWebhooks, fetchApiKeys, fetchSlack, fetchTeam, fetchAlertRoutes, fetchContracts, fetchVendors]);

  useEffect(() => {
    if (activeTab === 'audit') fetchAudit();
  }, [activeTab, fetchAudit]);

  // ── Webhook handlers ──
  const addWebhook = async () => {
    if (!newUrl) return;
    setWhLoading(true);
    setWhError(null);
    const res = await fetch('/api/webhooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: newUrl, events_filter: newFilter }),
    });
    const data = await res.json();
    if (!res.ok) {
      setWhError(data.error);
    } else {
      setNewUrl('');
      fetchWebhooks();
    }
    setWhLoading(false);
  };

  const deleteWebhook = async (id: string) => {
    await fetch('/api/webhooks', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchWebhooks();
  };

  const testWebhook = async (id: string) => {
    setTestResult((prev) => ({ ...prev, [id]: 'Sending...' }));
    const res = await fetch('/api/webhooks/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhookId: id }),
    });
    const data = await res.json();
    setTestResult((prev) => ({ ...prev, [id]: data.message }));
  };

  const loadDeliveries = async (webhookId: string) => {
    if (showDeliveries === webhookId) {
      setShowDeliveries(null);
      return;
    }
    setShowDeliveries(webhookId);
    const res = await fetch(`/api/webhooks/deliveries?webhook_id=${webhookId}`);
    const data = await res.json();
    if (res.ok) {
      setDeliveries((prev) => ({ ...prev, [webhookId]: data.deliveries }));
    }
  };

  // ── API key handlers ──
  const createApiKey = async () => {
    setKeyLoading(true);
    const res = await fetch('/api/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newKeyName || 'Untitled key' }),
    });
    const data = await res.json();
    if (res.ok) {
      setNewKeyRaw(data.key.rawKey);
      setNewKeyName('');
      fetchApiKeys();
    }
    setKeyLoading(false);
  };

  const deleteApiKey = async (id: string) => {
    await fetch('/api/api-keys', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchApiKeys();
  };

  // ── Slack handlers ──
  const saveSlack = async () => {
    setSlackLoading(true);
    const res = await fetch('/api/integrations/slack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webhook_url: slackUrl,
        channel: slackChannel,
        severity_filter: slackFilters,
        active: slackActive,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setSlackIntegration(data.integration);
    }
    setSlackLoading(false);
  };

  const testSlack = async () => {
    setSlackTestResult('Sending...');
    const res = await fetch('/api/integrations/slack/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhook_url: slackUrl }),
    });
    const data = await res.json();
    setSlackTestResult(data.message);
  };

  const toggleSlackFilter = (sev: string) => {
    setSlackFilters((prev) =>
      prev.includes(sev) ? prev.filter((s) => s !== sev) : [...prev, sev]
    );
  };

  const deleteSlack = async () => {
    await fetch('/api/integrations/slack', { method: 'DELETE' });
    setSlackIntegration(null);
    setSlackUrl('');
    setSlackChannel('');
    setSlackFilters(['critical', 'warning', 'notice']);
    setSlackActive(true);
  };

  // ── Alert route handlers ──
  const addAlertRoute = async () => {
    if (!newRouteEmail) return;
    setRouteLoading(true);
    setRouteError(null);
    const res = await fetch('/api/teams/alert-routes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: newRouteEmail,
        severity_filter: newRouteSeverity,
        vendor_filter: newRouteVendor,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setRouteError(data.error);
    } else {
      setNewRouteEmail('');
      fetchAlertRoutes();
    }
    setRouteLoading(false);
  };

  const deleteAlertRoute = async (id: string) => {
    await fetch('/api/teams/alert-routes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchAlertRoutes();
  };

  // ── Contract handlers ──
  const addContract = async () => {
    if (!contractVendorId || !contractDate) return;
    setContractLoading(true);
    setContractError(null);
    const res = await fetch('/api/vendor-contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vendor_id: contractVendorId,
        contract_renewal_date: contractDate,
        notice_period_days: parseInt(contractNotice) || 30,
        contract_value: contractValue || null,
        notes: contractNotes || null,
        auto_renews: contractAutoRenews,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setContractError(data.error);
    } else {
      setContractVendorId('');
      setContractDate('');
      setContractNotice('30');
      setContractValue('');
      setContractNotes('');
      setContractAutoRenews(true);
      fetchContracts();
    }
    setContractLoading(false);
  };

  const deleteContract = async (id: string) => {
    await fetch('/api/vendor-contracts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchContracts();
  };

  function getVendorName(contract: VendorContract): string {
    const v = contract.vendors;
    if (!v) return 'Unknown';
    if (Array.isArray(v)) return v[0]?.name || 'Unknown';
    return v.name;
  }

  function daysUntil(dateStr: string): number {
    const d = new Date(dateStr);
    const now = new Date();
    return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  // ── Team handlers ──
  const createTeam = async () => {
    setTeamLoading(true);
    setTeamError(null);
    const res = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: teamName || 'My Team' }),
    });
    const data = await res.json();
    if (!res.ok) {
      setTeamError(data.error);
    } else {
      setTeamName('');
      fetchTeam();
    }
    setTeamLoading(false);
  };

  const inviteMember = async () => {
    if (!inviteEmail) return;
    setTeamLoading(true);
    setTeamError(null);
    const res = await fetch('/api/teams/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    const data = await res.json();
    if (!res.ok) {
      setTeamError(data.error);
    } else {
      setInviteEmail('');
      fetchTeam();
    }
    setTeamLoading(false);
  };

  const removeMember = async (memberId: string) => {
    await fetch('/api/teams/members', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId }),
    });
    fetchTeam();
  };

  // ── Audit handlers ──
  const exportAuditCsv = () => {
    const params = new URLSearchParams();
    if (auditFilter) params.set('action', auditFilter);
    window.open(`/api/audit/export?${params}`, '_blank');
  };

  const handleTabClick = (tabId: SettingsTab) => {
    const tab = TAB_CONFIG.find((t) => t.id === tabId);
    if (tab && hasAccess(plan, tab.requiredPlan)) {
      setActiveTab(tabId);
    }
  };

  if (authLoading || planLoading) {
    return (
      <main className="dashboard-page">
        <DashboardNav />
        <div className="wrap"><div className="hist-loading">Loading...</div></div>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <DashboardNav />

      <div className="wrap">
        <header className="dash-header">
          <div className="tag tag-purple">Settings</div>
          <h1>Settings</h1>
        </header>

        {!hasPro ? (
          <div className="hist-gate">
            <div className="hist-gate-overlay">
              <div className="hist-gate-content">
                <h2>Unlock integrations &amp; settings</h2>
                <p>Webhooks, API access, Slack notifications, team management, and audit logs are available on Pro and Business plans.</p>
                <a href="/pricing" className="hist-gate-btn">Upgrade to Pro &rarr;</a>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Tab bar */}
            <div className="sett-tabs">
              {TAB_CONFIG.map((tab) => {
                const isAccessible = hasAccess(plan, tab.requiredPlan);
                return (
                  <button
                    key={tab.id}
                    className={`sett-tab${activeTab === tab.id ? ' active' : ''}${!isAccessible ? ' locked' : ''}`}
                    onClick={() => handleTabClick(tab.id)}
                    disabled={!isAccessible}
                    title={!isAccessible ? `Requires ${tab.requiredPlan} plan` : undefined}
                  >
                    {tab.label}
                    {!isAccessible && <span className="sett-lock">&#128274;</span>}
                  </button>
                );
              })}
            </div>

            {/* ── Webhooks Tab ── */}
            {activeTab === 'webhooks' && (
              <div className="sett-section">
                <h2>Webhook Endpoints</h2>
                <p className="sett-desc">Receive a POST request whenever a vendor change is detected.</p>

                <div className="sett-form-row">
                  <input
                    type="url"
                    className="sett-input"
                    placeholder="https://your-app.com/webhook"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                  />
                  <select className="sett-select" value={newFilter} onChange={(e) => setNewFilter(e.target.value)}>
                    <option value="all">All changes</option>
                    <option value="critical">Critical only</option>
                    <option value="warning_critical">Warning + Critical</option>
                  </select>
                  <button className="pill pill-solid pill-sm" onClick={addWebhook} disabled={whLoading || !newUrl}>
                    {whLoading ? 'Adding...' : 'Add webhook'}
                  </button>
                </div>
                {whError && <p className="sett-error">{whError}</p>}

                {webhooks.length === 0 ? (
                  <p className="sett-empty">No webhooks configured yet.</p>
                ) : (
                  <div className="sett-list">
                    {webhooks.map((wh) => (
                      <div key={wh.id} className="sett-item">
                        <div className="sett-item-main">
                          <span className="sett-item-url">{wh.url}</span>
                          <span className="sett-item-filter">{wh.events_filter}</span>
                          <span className={`sett-item-status ${wh.active ? 'active' : ''}`}>{wh.active ? 'Active' : 'Inactive'}</span>
                        </div>
                        <div className="sett-item-actions">
                          <button className="pill pill-ghost pill-sm" onClick={() => testWebhook(wh.id)}>Test</button>
                          <button className="pill pill-ghost pill-sm" onClick={() => loadDeliveries(wh.id)}>
                            {showDeliveries === wh.id ? 'Hide' : 'Deliveries'}
                          </button>
                          <button className="pill pill-ghost pill-sm danger" onClick={() => deleteWebhook(wh.id)}>Delete</button>
                        </div>
                        {testResult[wh.id] && <p className="sett-test-result">{testResult[wh.id]}</p>}

                        {showDeliveries === wh.id && deliveries[wh.id] && (
                          <div className="sett-deliveries">
                            {deliveries[wh.id].length === 0 ? (
                              <p className="sett-empty">No deliveries yet.</p>
                            ) : (
                              <table className="sett-del-table">
                                <thead>
                                  <tr><th>Status</th><th>Response</th><th>Time</th></tr>
                                </thead>
                                <tbody>
                                  {deliveries[wh.id].map((d) => (
                                    <tr key={d.id}>
                                      <td><span className={`sett-status-code ${d.status_code >= 200 && d.status_code < 300 ? 'ok' : 'fail'}`}>{d.status_code || 'ERR'}</span></td>
                                      <td className="sett-del-body">{d.response_body?.slice(0, 100) || '-'}</td>
                                      <td>{new Date(d.attempted_at).toLocaleString()}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── API Keys Tab ── */}
            {activeTab === 'api' && (
              <div className="sett-section">
                <h2>API Keys</h2>
                <p className="sett-desc">Use API keys to access the StackDrift JSON API at <code>/api/v1/changes</code>.</p>

                <div className="sett-form-row">
                  <input
                    type="text"
                    className="sett-input"
                    placeholder="Key name (e.g. Production)"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                  <button className="pill pill-solid pill-sm" onClick={createApiKey} disabled={keyLoading}>
                    {keyLoading ? 'Creating...' : 'Generate key'}
                  </button>
                </div>

                {newKeyRaw && (
                  <div className="sett-key-reveal">
                    <p>Your new API key (copy it now — it won&apos;t be shown again):</p>
                    <code className="sett-key-code">{newKeyRaw}</code>
                    <button className="pill pill-ghost pill-sm" onClick={() => { navigator.clipboard.writeText(newKeyRaw); }}>Copy</button>
                    <button className="pill pill-ghost pill-sm" onClick={() => setNewKeyRaw(null)}>Dismiss</button>
                  </div>
                )}

                {apiKeys.length === 0 ? (
                  <p className="sett-empty">No API keys created yet.</p>
                ) : (
                  <div className="sett-list">
                    {apiKeys.map((key) => (
                      <div key={key.id} className="sett-item">
                        <div className="sett-item-main">
                          <span className="sett-item-url">{key.name}</span>
                          <span className="sett-item-filter">
                            Last used: {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}
                          </span>
                        </div>
                        <div className="sett-item-actions">
                          <button className="pill pill-ghost pill-sm danger" onClick={() => deleteApiKey(key.id)}>Revoke</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="sett-api-docs">
                  <h3>Usage</h3>
                  <pre className="sett-code-block">{`curl -H "Authorization: Bearer sd_live_..." \\
  "https://stackdrift.app/api/v1/changes?severity=critical&limit=10"`}</pre>
                </div>
              </div>
            )}

            {/* ── Slack Tab ── */}
            {activeTab === 'slack' && (
              <div className="sett-section">
                <h2>Slack Integration</h2>
                <p className="sett-desc">Receive formatted alerts in your Slack channel when vendor policies change.</p>

                <div className="sett-slack-form">
                  <label className="sett-label">Slack Webhook URL</label>
                  <input
                    type="url"
                    className="sett-input"
                    placeholder="https://hooks.slack.com/services/..."
                    value={slackUrl}
                    onChange={(e) => setSlackUrl(e.target.value)}
                  />

                  <label className="sett-label">Channel name (optional)</label>
                  <input
                    type="text"
                    className="sett-input"
                    placeholder="#tos-alerts"
                    value={slackChannel}
                    onChange={(e) => setSlackChannel(e.target.value)}
                  />

                  <label className="sett-label">Severity filter</label>
                  <div className="sett-check-row">
                    {['critical', 'warning', 'notice'].map((sev) => (
                      <label key={sev} className="sett-check">
                        <input
                          type="checkbox"
                          checked={slackFilters.includes(sev)}
                          onChange={() => toggleSlackFilter(sev)}
                        />
                        {sev.charAt(0).toUpperCase() + sev.slice(1)}
                      </label>
                    ))}
                  </div>

                  <div className="sett-slack-toggle">
                    <span>Enabled</span>
                    <button
                      className={`ud-toggle ${slackActive ? 'on' : ''}`}
                      onClick={() => setSlackActive(!slackActive)}
                    >
                      <span className="ud-toggle-thumb" />
                    </button>
                  </div>

                  <div className="sett-form-row">
                    <button className="pill pill-solid pill-sm" onClick={saveSlack} disabled={slackLoading || !slackUrl}>
                      {slackLoading ? 'Saving...' : slackIntegration ? 'Update' : 'Save'}
                    </button>
                    <button className="pill pill-ghost pill-sm" onClick={testSlack} disabled={!slackUrl}>Test</button>
                    {slackIntegration && (
                      <button className="pill pill-ghost pill-sm danger" onClick={deleteSlack}>Remove</button>
                    )}
                  </div>
                  {slackTestResult && <p className="sett-test-result">{slackTestResult}</p>}
                </div>
              </div>
            )}

            {/* ── Team Tab (Business only) ── */}
            {activeTab === 'team' && hasBusiness && (
              <div className="sett-section">
                <h2>Team Management</h2>
                <p className="sett-desc">Invite up to 10 team members (including yourself) to share your StackDrift workspace.</p>

                {!team ? (
                  <div className="sett-team-create">
                    <p className="sett-empty">You haven&apos;t created a team yet.</p>
                    <div className="sett-form-row">
                      <input
                        type="text"
                        className="sett-input"
                        placeholder="Team name"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                      />
                      <button className="pill pill-solid pill-sm" onClick={createTeam} disabled={teamLoading}>
                        {teamLoading ? 'Creating...' : 'Create team'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="sett-team-header">
                      <span className="sett-team-name">{team.name}</span>
                      <span className="sett-team-count">{teamMembers.filter((m) => m.status !== 'removed').length + 1} / 10 seats</span>
                    </div>

                    {teamRole === 'owner' && (
                      <div className="sett-form-row">
                        <input
                          type="email"
                          className="sett-input"
                          placeholder="team@example.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                        />
                        <select className="sett-select" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button className="pill pill-solid pill-sm" onClick={inviteMember} disabled={teamLoading || !inviteEmail}>
                          {teamLoading ? 'Inviting...' : 'Invite'}
                        </button>
                      </div>
                    )}
                    {teamError && <p className="sett-error">{teamError}</p>}

                    <div className="sett-list">
                      <div className="sett-item">
                        <div className="sett-item-main">
                          <span className="sett-item-url">You (Owner)</span>
                          <span className={`sett-item-status active`}>Active</span>
                        </div>
                      </div>
                      {teamMembers
                        .filter((m) => m.status !== 'removed')
                        .map((member) => (
                          <div key={member.id} className="sett-item">
                            <div className="sett-item-main">
                              <span className="sett-item-url">{member.email}</span>
                              <span className="sett-item-filter">{member.role}</span>
                              <span className={`sett-item-status ${member.status === 'active' ? 'active' : ''}`}>
                                {member.status === 'pending' ? 'Pending' : 'Active'}
                              </span>
                            </div>
                            {teamRole === 'owner' && (
                              <div className="sett-item-actions">
                                <button className="pill pill-ghost pill-sm danger" onClick={() => removeMember(member.id)}>Remove</button>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>

                    {/* Shared Alert Routing */}
                    {teamRole === 'owner' && (
                      <div className="sett-alert-routes">
                        <h3 className="sett-sub-heading">Shared Alert Routing</h3>
                        <p className="sett-desc">Route alerts to shared email addresses like legal@, compliance@, or security@. Max 5 routes.</p>

                        <div className="sett-form-row">
                          <input
                            type="email"
                            className="sett-input"
                            placeholder="legal@company.com"
                            value={newRouteEmail}
                            onChange={(e) => setNewRouteEmail(e.target.value)}
                          />
                          <select className="sett-select" value={newRouteSeverity} onChange={(e) => setNewRouteSeverity(e.target.value)}>
                            <option value="all">All severities</option>
                            <option value="critical">Critical only</option>
                            <option value="warning_critical">Warning + Critical</option>
                          </select>
                          <button className="pill pill-solid pill-sm" onClick={addAlertRoute} disabled={routeLoading || !newRouteEmail}>
                            {routeLoading ? 'Adding...' : 'Add route'}
                          </button>
                        </div>
                        {routeError && <p className="sett-error">{routeError}</p>}

                        {alertRoutes.length === 0 ? (
                          <p className="sett-empty">No shared alert routes configured.</p>
                        ) : (
                          <div className="sett-list">
                            {alertRoutes.map((route) => (
                              <div key={route.id} className="sett-item">
                                <div className="sett-item-main">
                                  <span className="sett-item-url">{route.email}</span>
                                  <span className="sett-item-filter">{route.severity_filter}</span>
                                </div>
                                <div className="sett-item-actions">
                                  <button className="pill pill-ghost pill-sm danger" onClick={() => deleteAlertRoute(route.id)}>Remove</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── Contracts Tab (Business only) ── */}
            {activeTab === 'contracts' && hasBusiness && (
              <div className="sett-section">
                <h2>Renewal Reminders</h2>
                <p className="sett-desc">Track vendor contract renewal dates and get notified before they expire.</p>

                <div className="sett-contract-form">
                  <div className="sett-form-row">
                    <select
                      className="sett-select"
                      value={contractVendorId}
                      onChange={(e) => setContractVendorId(e.target.value)}
                    >
                      <option value="">Select vendor...</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                    <input
                      type="date"
                      className="sett-input"
                      value={contractDate}
                      onChange={(e) => setContractDate(e.target.value)}
                    />
                    <button className="pill pill-solid pill-sm" onClick={addContract} disabled={contractLoading || !contractVendorId || !contractDate}>
                      {contractLoading ? 'Adding...' : 'Add reminder'}
                    </button>
                  </div>
                  <div className="sett-form-row">
                    <input
                      type="number"
                      className="sett-input sett-input-sm"
                      placeholder="Notice days"
                      value={contractNotice}
                      onChange={(e) => setContractNotice(e.target.value)}
                      min="1"
                      max="365"
                    />
                    <input
                      type="text"
                      className="sett-input"
                      placeholder="Contract value (optional)"
                      value={contractValue}
                      onChange={(e) => setContractValue(e.target.value)}
                    />
                    <label className="sett-check">
                      <input
                        type="checkbox"
                        checked={contractAutoRenews}
                        onChange={(e) => setContractAutoRenews(e.target.checked)}
                      />
                      Auto-renews
                    </label>
                  </div>
                  <input
                    type="text"
                    className="sett-input"
                    placeholder="Notes (optional)"
                    value={contractNotes}
                    onChange={(e) => setContractNotes(e.target.value)}
                  />
                </div>
                {contractError && <p className="sett-error">{contractError}</p>}

                {contracts.length === 0 ? (
                  <p className="sett-empty">No renewal reminders configured yet.</p>
                ) : (
                  <div className="sett-list">
                    {contracts.map((c) => {
                      const days = daysUntil(c.contract_renewal_date);
                      const urgency = days <= 0 ? 'expired' : days <= 30 ? 'urgent' : days <= 60 ? 'soon' : 'ok';
                      return (
                        <div key={c.id} className="sett-item">
                          <div className="sett-item-main">
                            <span className="sett-item-url">{getVendorName(c)}</span>
                            <span className={`sett-contract-days ${urgency}`}>
                              {days <= 0 ? 'Expired' : `${days}d remaining`}
                            </span>
                            <span className="sett-item-filter">
                              Renews: {new Date(c.contract_renewal_date).toLocaleDateString()}
                            </span>
                            {c.auto_renews && <span className="sett-contract-auto">Auto</span>}
                            {c.contract_value && <span className="sett-item-filter">{c.contract_value}</span>}
                          </div>
                          <div className="sett-item-meta">
                            <span className="sett-item-filter">Notice: {c.notice_period_days}d</span>
                            {c.notes && <span className="sett-item-filter">{c.notes}</span>}
                            {c.reminder_sent && <span className="sett-contract-sent">Reminder sent</span>}
                          </div>
                          <div className="sett-item-actions">
                            <button className="pill pill-ghost pill-sm danger" onClick={() => deleteContract(c.id)}>Remove</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Audit Log Tab (Business only) ── */}
            {activeTab === 'audit' && hasBusiness && (
              <div className="sett-section">
                <h2>Audit Log</h2>
                <p className="sett-desc">Track all account activity for compliance and security monitoring.</p>

                <div className="sett-form-row">
                  <select
                    className="sett-select"
                    value={auditFilter}
                    onChange={(e) => { setAuditFilter(e.target.value); setAuditPage(1); }}
                  >
                    <option value="">All actions</option>
                    <option value="webhook.create">Webhook created</option>
                    <option value="webhook.delete">Webhook deleted</option>
                    <option value="apikey.create">API key created</option>
                    <option value="apikey.revoke">API key revoked</option>
                    <option value="slack.connect">Slack connected</option>
                    <option value="slack.disconnect">Slack disconnected</option>
                    <option value="export.pdf">PDF exported</option>
                    <option value="team.invite">Team invite</option>
                    <option value="team.remove">Team remove</option>
                  </select>
                  <button className="pill pill-ghost pill-sm" onClick={exportAuditCsv}>Export CSV</button>
                </div>

                {auditLoading ? (
                  <div className="hist-loading">Loading audit log...</div>
                ) : auditEntries.length === 0 ? (
                  <p className="sett-empty">No audit events recorded yet.</p>
                ) : (
                  <>
                    <table className="sett-del-table sett-audit-table">
                      <thead>
                        <tr>
                          <th>Action</th>
                          <th>Detail</th>
                          <th>Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditEntries.map((entry) => (
                          <tr key={entry.id}>
                            <td><span className="sett-audit-action">{entry.action}</span></td>
                            <td className="sett-del-body">{entry.detail || '-'}</td>
                            <td>{new Date(entry.created_at).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {auditTotalPages > 1 && (
                      <div className="hist-pagination">
                        <button className="hist-page-btn" disabled={auditPage <= 1} onClick={() => setAuditPage(auditPage - 1)}>
                          &larr; Previous
                        </button>
                        <span className="hist-page-info">Page {auditPage} of {auditTotalPages}</span>
                        <button className="hist-page-btn" disabled={auditPage >= auditTotalPages} onClick={() => setAuditPage(auditPage + 1)}>
                          Next &rarr;
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}

        <footer className="dash-footer">
          <span>&copy; 2026 StackDrift</span>
          <div className="f-links">
            <a href="/intel">Intel</a>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="mailto:support@stackdrift.app">Support</a>
          </div>
        </footer>
      </div>
    </main>
  );
}
