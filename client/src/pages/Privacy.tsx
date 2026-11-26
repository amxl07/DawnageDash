// Public privacy policy, linked from the mobile app (App Store / Play requirement).
// Plain-language policy written 2026-11-22; not legal advice.
const CONTACT_EMAIL = "dawnageofficial@gmail.com";
const UPDATED = "22 November 2026";

const sections: { title: string; body: string[] }[] = [
  {
    title: "Who we are",
    body: [
      "Dawnage is an online fitness coaching service. The Dawnage app and dashboard let you share your progress with your coach, who uses it to build and adjust your training and nutrition plan.",
    ],
  },
  {
    title: "What we collect",
    body: [
      "Account details: your name, email address, phone number and country.",
      "Your onboarding questionnaire: goals, training background and the health information you choose to share with your coach.",
      "What you log: daily check-ins (such as weight, sleep, steps, food intake, water, energy, hunger, stress, digestion and notes), body measurements, workout logs, weekly feedback and progress photos.",
      "Apple Health and Health Connect: only if you allow it, the app reads your weight, steps, nutrition and water so you can choose to add them to a check-in. Values only leave your phone when you submit a check-in. We never write to Apple Health or Health Connect, and we never use health data for advertising.",
      "App diagnostics: if the app fails, it may send a technical error report. These reports exclude your answers, health values, photos and account identifiers.",
    ],
  },
  {
    title: "How we use it",
    body: [
      "To provide your coaching: your coach reviews your logs, photos and feedback to plan and adjust your program.",
      "We do not sell your data, show you ads, or share your data with advertisers or data brokers.",
    ],
  },
  {
    title: "Who can see it",
    body: [
      "You, the coach assigned to you, and Dawnage administrators. Progress photos are stored privately and are shown only through short-lived links.",
      "Your data is stored with our hosting provider, Supabase, in the Asia-Pacific (Sydney) region.",
    ],
  },
  {
    title: "How long we keep it, and deleting it",
    body: [
      "We keep your data while your account is active.",
      "You can delete your account at any time in the app: You → Delete account. This permanently deletes your profile, check-ins, measurements, workouts, weekly feedback and progress photos. Payment records are kept for accounting, without being linked to you.",
      `You can also ask us to access, correct or delete your data by emailing ${CONTACT_EMAIL}.`,
    ],
  },
  {
    title: "Children",
    body: ["Dawnage is not intended for children."],
  },
  {
    title: "Changes",
    body: ["If we change this policy we will update this page and the date below."],
  },
];

export default function Privacy() {
  return (
    <main className="w-full max-w-2xl mx-auto px-4 py-10 md:py-16">
      <h1 className="text-3xl font-bold tracking-tight">Privacy policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated {UPDATED}</p>
      {sections.map((section) => (
        <section key={section.title} className="mt-8">
          <h2 className="text-lg font-semibold">{section.title}</h2>
          {section.body.map((paragraph) => (
            <p key={paragraph} className="mt-2 leading-relaxed text-muted-foreground">{paragraph}</p>
          ))}
        </section>
      ))}
      <p className="mt-10 text-sm text-muted-foreground">Questions: {CONTACT_EMAIL}</p>
    </main>
  );
}
