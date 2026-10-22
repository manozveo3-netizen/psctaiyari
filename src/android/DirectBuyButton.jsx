import {useState} from 'react';

// Only independent APKs distributed outside Google Play may link to external
// checkout for in-app digital courses. Release AAB CI forces "play" distribution.
export const isDirectApk = import.meta.env.VITE_ANDROID_DISTRIBUTION === 'direct';
export const websiteCheckout = 'https://psctaiyari.com/pricing';

export default function DirectBuyButton({course,show=true}){
  const [busy,setBusy]=useState(false);
  if(!isDirectApk || !show || !course || course.is_free)return null;
  async function openCheckout(){
    if(busy)return;
    setBusy(true);
    try{
      // Custom Tabs keeps the app's own login state intact while the website
      // handles plan selection and QR verification in its own browser session.
      const {Browser}=await import('@capacitor/browser');
      await Browser.open({url:websiteCheckout});
    }catch(error){
      console.error('Could not open system browser',error);
      window.location.assign(websiteCheckout);
    }finally{
      setBusy(false);
    }
  }
  return <button type="button" className="btn" onClick={openCheckout} disabled={busy} aria-label={`Buy ${course.title_ne} from PSC Taiyari website`}>
    {busy?'खुल्दैछ…':'Buy · वेबसाइट'}
  </button>;
}
