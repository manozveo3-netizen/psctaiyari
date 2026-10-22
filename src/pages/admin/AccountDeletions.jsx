import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

// The database is in ap-northeast-1. Query-based regional routing avoids
// adding x-region to browser CORS preflight headers.
const FUNCTION_NAME = 'admin-account-deletions';
const PRIMARY_FUNCTION = FUNCTION_NAME + '?forceFunctionRegion=ap-northeast-1';
const FALLBACK_FUNCTION = FUNCTION_NAME + '?forceFunctionRegion=ap-southeast-1';

async function explainFailure(error, data) {
  if (!error && data?.error) {
    return { message: String(data.error), temporary: false };
  }
  const response = error?.context;
  let serverMessage = '';
  if (response && typeof response.clone === 'function') {
    try {
      const payload = await response.clone().json();
      serverMessage = payload?.error || payload?.message || '';
    } catch {
      // Supabase gateway errors are not always JSON responses.
    }
  }
  const status = response?.status;
  const gatewayCode = response?.headers?.get?.('sb-error-code');
  const temporary =
    [502, 503, 504].includes(status) ||
    error?.name === 'FunctionsFetchError' ||
    error?.name === 'FunctionsRelayError' ||
    /failed to send a request|failed to fetch|networkerror/i.test(error?.message || '');

  const message = serverMessage ||
    (gatewayCode === 'SUPABASE_EDGE_RUNTIME_SERVICE_DEGRADED'
      ? 'Supabase Edge Runtime अस्थायी रूपमा उपलब्ध छैन।'
      : status === 503
        ? 'Supabase Edge Function अहिले अस्थायी रूपमा उपलब्ध छैन (503)।'
        : error?.message || 'Edge Function request failed');
  return { message, temporary, status };
}

async function invokeDeletionFunction(body) {
  if (!supabase) throw Error('Supabase configuration उपलब्ध छैन।');
  const first = await supabase.functions.invoke(PRIMARY_FUNCTION, { body });
  if (!first.error && !first.data?.error) return first.data;

  const firstProblem = await explainFailure(first.error, first.data);
  // "list" is read-only. A regional retry is safe; never automatically
  // replay review, reject, or irreversible delete actions.
  if (body.action === 'list' && firstProblem.temporary) {
    const second = await supabase.functions.invoke(FALLBACK_FUNCTION, { body });
    if (!second.error && !second.data?.error) return second.data;
    const secondProblem = await explainFailure(second.error, second.data);
    throw Error(
      'Deletion Requests लोड हुन सकेन (Tokyo र Singapore दुवै प्रयास गरियो): ' +
      secondProblem.message
    );
  }
  if (body.action === 'delete' && firstProblem.temporary) {
    throw Error(
      'Server सँग सम्पर्क अवरुद्ध भयो। Deletion पूरा भएको हुन सक्छ। ' +
      'दोहोऱ्याउनु अघि Refresh गरी request status जाँच्नुहोस्। ' +
      firstProblem.message
    );
  }
  throw Error(firstProblem.message);
}

export default function AccountDeletions() {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [listError, setListError] = useState('');
  const [message, setMessage] = useState('');
  const [notes, setNotes] = useState({});

  const load = useCallback(async () => {
    setListError('');
    setLoading(true);
    try {
      const data = await invokeDeletionFunction({ action: 'list' });
      setItems(data.requests || []);
      setLoaded(true);
    } catch (e) {
      setListError(e.message);
      setLoaded(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(item, action) {
    const note = notes[item.id] || '';
    if (action === 'reject' && !note.trim()) {
      setError('Reject गर्न कारण लेख्नुहोस्।');
      return;
    }

    let confirm;
    if (action === 'delete') {
      if (!window.confirm('यो कार्यले प्रयोगकर्ताको खाता स्थायी रूपमा हटाउन सक्छ। अगाडि बढ्ने?')) return;
      confirm = window.prompt('पुष्टि गर्न यो User ID पूरा टाइप गर्नुहोस्: ' + item.user_id);
      if (confirm !== item.user_id) {
        setError('User ID मिलेन। खाता हटाइएको छैन।');
        return;
      }
    }

    setBusy(item.id);
    setError('');
    setMessage('');
    try {
      const result = await invokeDeletionFunction({
        action,
        request_id: item.id,
        note,
        confirm,
      });
      setMessage(
        action === 'delete'
          ? result.audit_saved
            ? 'Account deletion completed and audit saved.'
            : 'Account deletion completed, तर audit save भएन। तुरुन्त जाँच गर्नुहोस्।'
          : 'Request updated.'
      );
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  }

  return (
    <section className="card" style={{ padding: 20 }}>
      <div className="pagehead">
        <div>
          <h2>Account Deletion Requests</h2>
          <p>Review user requests before irreversible deletion.</p>
        </div>
        <button className="btn" onClick={load} disabled={loading || !!busy}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && <p role="alert" className="notice">{error}</p>}
      {message && <p role="status" className="notice">{message}</p>}
      {listError && <p role="alert" className="notice">{listError}</p>}

      {loading && !loaded ? (
        <p role="status">अनुरोधहरू लोड हुँदैछन्…</p>
      ) : !loaded ? (
        <p>अनुरोध लोड हुन सकेन। Refresh गर्नुहोस्।</p>
      ) : items.length === 0 ? (
        <p>हाल कुनै deletion request छैन।</p>
      ) : (
        items.map(item => (
          <article key={item.id} className="card" style={{ padding: 16, marginBottom: 12 }}>
            <p><strong>{item.full_name || 'User'}</strong> · <strong>{item.status}</strong></p>
            <p style={{ overflowWrap: 'anywhere' }}>User ID: <code>{item.user_id}</code></p>
            <p>Requested: {new Date(item.requested_at).toLocaleString()}</p>
            {item.review_note && <p>Previous note: {item.review_note}</p>}
            {['pending', 'in_review'].includes(item.status) && (
              <>
                <label>
                  Review note
                  <textarea rows={2} style={{ display: 'block', width: '100%' }}
                    value={notes[item.id] || ''}
                    onChange={e => setNotes(s => ({ ...s, [item.id]: e.target.value }))} />
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                  {item.status === 'pending' &&
                    <button className="btn" disabled={!!busy} onClick={() => act(item, 'review')}>
                      Mark In Review
                    </button>}
                  <button className="btn" disabled={!!busy} onClick={() => act(item, 'reject')}>Reject</button>
                  {item.status === 'in_review' &&
                    <button className="btn" disabled={!!busy} onClick={() => act(item, 'delete')}>
                      Approve &amp; Delete Account
                    </button>}
                </div>
              </>
            )}
          </article>
        ))
      )}
    </section>
  );
}
