import {Navigate,useLocation} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
export function Guard({children,admin=false,roles}) {
 const {user,profile,loading,error,refreshProfile}=useAuth();const location=useLocation();
 if(loading)return <div className="center" role="status">Loading…</div>;
 if(!user)return <Navigate to="/login" state={{from:location.pathname+location.search}} replace/>;
 if(error)return <div className="card" role="alert">Unable to load your profile. <button onClick={refreshProfile}>Retry</button></div>;
 const allowed=roles||(admin?['admin','reviewer']:null);
 if(allowed&&!allowed.includes(profile?.role))return <Navigate to="/dashboard" replace/>;
 return children;
}
