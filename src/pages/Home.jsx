import {Link} from 'react-router-dom';

export default function Home(){return <div className="simple-landing">
  <section className="simple-hero" aria-labelledby="home-title">
    <h1 id="home-title">लोकसेवा तयारी,<span>सरल तरिकाले।</span></h1>
    <p>पाठ्यक्रम, नोट्स र Mock Test—तपाईंलाई चाहिने कुरा, एकै ठाउँमा।</p>
    <Link className="btn simple-primary" to="/login?mode=register">तयारी सुरु गर्नुहोस् <span aria-hidden="true">→</span></Link>
    <div className="simple-assurances" aria-label="मुख्य सुविधाहरू">
      <span><i aria-hidden="true">✓</i> पाठ्य सामग्री</span>
      <span><i aria-hidden="true">✓</i> Mock Test</span>
      <span><i aria-hidden="true">✓</i> प्रगति ट्र्याकिङ</span>
    </div>
  </section>
</div>}
