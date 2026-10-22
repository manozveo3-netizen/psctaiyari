import React from 'react';
import {Link,useParams} from 'react-router-dom';
export const legalDocs=[
  {
    "title": "Privacy Policy",
    "slug": "privacy-policy",
    "paragraphs": [
      "We collect account information such as your name, email address, and authentication identifiers when you register or sign in.",
      "We process course access, learning progress, quiz answers, scores, and payment reference details to provide educational services and verify purchases.",
      "Supabase is used for authentication and application data storage. Its infrastructure may process information outside Nepal. We do not claim that data is never transferred internationally.",
      "We use information for account administration, learning functionality, payment review, security, fraud prevention, and support. We do not sell personal data.",
      "Data is accessible to authorized administrators and service providers only as needed for these purposes, subject to their respective safeguards.",
      "We retain information for as long as needed to provide the service, comply with applicable obligations, resolve disputes, and protect against abuse. Exact retention periods depend on the record and applicable requirements.",
      "You can request access, correction, or deletion by emailing nextlayerstech@gmail.com. See the Account Deletion page for the procedure and limitations.",
      "We use reasonable technical and organizational security measures, but no system can guarantee absolute security.",
      "The app is intended for learners; users should not register unless they meet applicable age and consent requirements. If you believe a child provided personal information without required consent, contact us.",
      "We may update this policy and publish the revised effective date. Contact: nextlayerstech@gmail.com."
    ]
  },
  {
    "title": "Terms & Conditions",
    "slug": "terms",
    "paragraphs": [
      "PSC Taiyari by NextLayers is an independent educational preparation service, not an official government or Public Service Commission application.",
      "You must provide accurate registration details, keep credentials confidential, and use the service lawfully.",
      "Learning materials, quizzes, and scores are provided for study purposes. We do not guarantee exam results, selection, or the accuracy of every item.",
      "You may not copy, redistribute, scrape, or resell protected learning content without permission.",
      "Plans and access entitlements are displayed in the app and may change for future purchases. Payment submission does not itself guarantee activation until verified.",
      "We may restrict accounts for abuse, fraud, security threats, or serious violations, subject to applicable law.",
      "Service availability may be interrupted by maintenance, connectivity, or third-party infrastructure.",
      "Applicable mandatory consumer and privacy rights remain unaffected. Questions or disputes: nextlayerstech@gmail.com."
    ]
  },
  {
    "title": "Account Deletion",
    "slug": "delete-account",
    "paragraphs": [
      "You may request deletion of your PSC Taiyari account and associated personal data by emailing nextlayerstech@gmail.com from your registered email address with the subject “PSC Taiyari Account Deletion”.",
      "Include your registered email address; do not send your password, OTP, or other secrets.",
      "We will verify account ownership before processing the request. We will explain any additional verification steps through email.",
      "Following verification, we will process deletion of the account and associated learning records where permitted and applicable. Some payment, audit, security, or legal records may need to be retained for applicable legal obligations or dispute resolution.",
      "We will communicate the outcome and any retained data categories by email. Deletion may be irreversible and can end access to purchased courses.",
      "This page provides a public request method; it does not mean that automatic in-app account deletion has been implemented. For help contact nextlayerstech@gmail.com."
    ]
  },
  {
    "title": "Data Retention Policy",
    "slug": "data-retention",
    "paragraphs": [
      "Account profile, course progress, quiz attempts, and related learning records are retained while necessary to operate the account and provide the service.",
      "Payment references and transaction records may be retained for reconciliation, fraud prevention, dispute handling, and legal or accounting obligations.",
      "After a verified deletion request, eligible personal data will be deleted or de-identified where feasible, while records required for legal or legitimate compliance purposes may remain for the applicable period.",
      "Specific retention periods have not yet been established publicly; contact nextlayerstech@gmail.com to ask about a particular category of data.",
      "We review data retention practices as our services and obligations change."
    ]
  },
  {
    "title": "Refund & Cancellation Policy",
    "slug": "refund-policy",
    "paragraphs": [
      "Before payment, review the plan description, price, and duration shown in PSC Taiyari.",
      "Payments may require manual verification using a transaction reference. Do not submit duplicate payments while a transaction is under review.",
      "To request a cancellation or refund, email nextlayerstech@gmail.com with your registered email, plan, payment date, transaction reference, and reason. Never send passwords or OTPs.",
      "Requests are reviewed based on payment verification, service delivery, the circumstances of the purchase, and applicable consumer law. This policy does not promise automatic refunds or waive statutory rights.",
      "Deleting your account does not automatically trigger a refund or cancel any external recurring billing arrangement. If recurring billing is introduced, the relevant cancellation steps will be disclosed separately."
    ]
  },
  {
    "title": "Educational Disclaimer",
    "slug": "disclaimer",
    "paragraphs": [
      "PSC Taiyari is an independent exam preparation and learning app operated under the NextLayers brand.",
      "It is not affiliated with, endorsed by, or operated by Nepal's Public Service Commission (Lok Sewa Aayog) or any government authority.",
      "Exam notices, syllabuses, dates, eligibility rules, and official results should always be verified directly with the relevant government authority.",
      "Study notes, practice questions, mock tests, performance indicators, and AI-assisted content (where offered) may contain errors or become outdated. They do not guarantee examination success."
    ]
  },
  {
    "title": "Contact & Support",
    "slug": "contact",
    "paragraphs": [
      "PSC Taiyari by NextLayers",
      "Privacy, account deletion, billing, technical support, and general inquiries: nextlayerstech@gmail.com.",
      "When requesting help, describe the issue and include your registered email address if relevant. Do not share your password, one-time codes, or confidential financial credentials.",
      "We will respond as reasonably practicable; no fixed response-time guarantee is made."
    ]
  }
];
export default function LegalPage({slug}){const params=useParams();const key=slug||params.slug;const doc=legalDocs.find(x=>x.slug===key);if(!doc)return <div className="card"><h1>Page not found</h1><Link to="/">Home</Link></div>;return <article className="card" style={{maxWidth:850,margin:'24px auto',lineHeight:1.8,padding:24}}><h1>{doc.title}</h1><p><strong>PSC Taiyari · NextLayers</strong><br/>Effective: 22 October 2026</p>{doc.paragraphs.map((p,i)=><p key={i}>{p}</p>)}<p>Contact: <a href="mailto:nextlayerstech@gmail.com">nextlayerstech@gmail.com</a></p><Link to="/">Back to home</Link></article>}
