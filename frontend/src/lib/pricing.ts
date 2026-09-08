export const PLANS_COPY = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    featured: false,
    cta: 'Start free',
    perks: [
      '1 chatbot',
      '3 docs · 5 MB',
      '100 messages / month',
      'In-app playground',
      'Embed with watermark',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29,
    featured: true,
    cta: 'Go Pro',
    perks: [
      '5 chatbots',
      '50 docs · 50 MB',
      '2,000 messages / month',
      'Custom branding',
      'No watermark',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    price: 79,
    featured: false,
    cta: 'Go Business',
    perks: [
      '20 chatbots',
      '200 docs · 200 MB',
      '10,000 messages / month',
      'Custom branding',
      'Higher usage limits',
    ],
  },
] as const
