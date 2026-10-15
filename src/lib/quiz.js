// Prefer only unsynced/newer browser changes over the server's saved attempt.
export function restoreAnswers(server,draft,attemptId,serverSavedAt){
 const saved=server||{};
 if(draft?.attempt_id!==attemptId)return saved;
 const newer=Number(draft.saved_at)>Date.parse(serverSavedAt||'1970-01-01');
 return newer||!Object.keys(saved).length?{...saved,...(draft.answers||{})}:saved;
}
