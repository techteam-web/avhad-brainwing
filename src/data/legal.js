// The gate's copy. Each block appears the moment it is filled and needs no other change.
//
//   ABOUT    a paragraph or two about the group — plain strings, one per paragraph
//   RERA     one entry per registration, as MahaRERA's certificate (Form 'C') states it
//   NOTICE   the small print under the fold (disclaimer, terms, whatever legal sends)

export const ABOUT = [];

// Copied off the registration certificates. `project` is the name as registered, which is
// not always the name on the brochure. `url` is where the QR code printed on the
// certificate points — the project's own page on MahaRERA — and `qr` is that same code,
// traced module for module off the certificate rather than generated afresh, so it is
// the code MahaRERA issued. Dates are ISO.
export const RERA = [
  {
    slug: 'bayline',
    project: 'Bayline Residences',
    number: 'PM1171012502324',
    promoter: 'HRUB Infra Projects Pvt Ltd',
    registered: '2026-02-11',
    validUntil: '2031-12-31',
    url: 'https://maharerait.maharashtra.gov.in/project/view/60689',
    qr: '/images/rera-bayline.svg',
  },
  {
    slug: 'homestead',
    project: 'Avhad Homestead',
    number: 'PR1170002601379',
    promoter: 'Hrub Infra Projects Private Limited',
    registered: '2026-07-31',
    validUntil: '2029-12-31',
    url: 'https://maharerait.maharashtra.gov.in/project/view/66049',
    qr: '/images/rera-homestead.svg',
  },
];

// The address every MahaRERA certificate sends you to for the details.
export const RERA_SITE = 'https://maharera.maharashtra.gov.in';

export const NOTICE = '';
