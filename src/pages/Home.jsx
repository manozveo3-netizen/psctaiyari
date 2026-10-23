import {Link} from 'react-router-dom';
import {BookOpen,ClipboardCheck,BarChart3} from 'lucide-react';
export default function Home(){return <div className="simple-landing">
  <section className="simple-hero">
    <span className="simple-kicker">लोकसेवा तयारी अब सजिलो</span>
    <h1>तयारी स्मार्ट बनाउनुहोस्।<br/>सफलतातर्फ अघि बढ्नुहोस्।</h1>
    <p>पाठ्यक्रम, अध्ययन सामग्री र Mock Test — सबै एकै ठाउँमा।</p>
    <Link className="btn simple-primary" to="/courses">तयारी सुरु गर्नुहोस् →</Link>
    <Link className="simple-secondary" to="/tests">अभ्यास परीक्षा हेर्नुहोस् →</Link>
  </section>
  <section className="simple-features" aria-label="मुख्य सुविधाहरू">
    <article><span className="simple-feature-icon"><BookOpen aria-hidden="true"/></span><h2>अध्ययन सामग्री</h2><p>पाठ, नोट र उपयोगी संसाधन एउटै ठाउँमा।</p></article>
    <article><span className="simple-feature-icon"><ClipboardCheck aria-hidden="true"/></span><h2>Mock Test</h2><p>वास्तविक परीक्षा जस्तै अभ्यास गर्नुहोस्।</p></article>
    <article><span className="simple-feature-icon"><BarChart3 aria-hidden="true"/></span><h2>तपाईंको प्रगति</h2><p>आफ्नो नतिजा र कमजोर पक्ष पहिचान गर्नुहोस्।</p></article>
  </section>
</div>}
