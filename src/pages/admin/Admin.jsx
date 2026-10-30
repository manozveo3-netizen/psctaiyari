import {useAuth} from '../../contexts/AuthContext';
import {NavLink,Outlet} from 'react-router-dom';

export default function Admin(){
 const {profile}=useAuth();
 return <div className="admin-workspace">
  <div className="pagehead admin-pagehead"><div><h1>Admin Panel</h1><p className="muted">लोकसेवा तयारीको सामग्री, प्रश्न र प्रकाशन व्यवस्थापन</p></div><NavLink className="btn admin-add-course" to="/admin/learning?new=course">＋ Add Course</NavLink></div>
  <nav className="adminnav" aria-label="Admin navigation">
   <NavLink end to="/admin">Overview</NavLink><NavLink to="/admin/catalog">Catalog</NavLink><NavLink to="/admin/learning">Course</NavLink><NavLink to="/admin/learning-materials">Learning Material</NavLink><NavLink to="/admin/questions">Questions</NavLink><NavLink to="/admin/question-review">Review queue</NavLink><NavLink to="/admin/tests">Tests</NavLink><NavLink to="/admin/bulk-upload">Upload CSV</NavLink>
   {profile?.role==='admin'&&<><NavLink to="/admin/users">Users</NavLink><NavLink to="/admin/account-deletions">Deletion Requests</NavLink><NavLink to="/admin/payment-qr">Payment QR</NavLink><NavLink to="/admin/payments">Payments</NavLink></>}
   <a href="/Admin_User_Manual_NE.pdf" target="_blank" rel="noreferrer">User Manual</a>
  </nav>
  <Outlet/>
 </div>
}
