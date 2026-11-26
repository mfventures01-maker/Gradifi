import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BriefcaseBusiness, School, University } from "lucide-react";

const paths = [
  {
    title: "Freelancers and independent individuals",
    description: "Create a personal Gradifi account as a freelancer, independent student, professional or another individual user. No institution is required.",
    action: "Start independent onboarding",
    href: "/onboarding?view=individual",
    icon: BriefcaseBusiness,
  },
  {
    title: "Schools and colleges",
    description: "Register a primary, secondary or K-12 institution. The existing Principal-led onboarding journey remains unchanged.",
    action: "Register a school",
    href: "/onboarding",
    icon: School,
  },
  {
    title: "Universities and higher institutions",
    description: "Register a university, polytechnic or College of Education under its Vice-Chancellor or Rector.",
    action: "Register a higher institution",
    href: "/onboarding/higher-education/register",
    icon: University,
  },
];

export const OnboardingStart: React.FC = () => (
  <main className="min-h-screen bg-slate-50 px-4 py-12">
    <div className="mx-auto max-w-5xl">
      <Link to="/" className="text-sm font-semibold text-blue-700">Gradifi</Link>
      <header className="mt-8 max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Choose your Gradifi path</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Choose how you use Gradifi.</h1>
        <p className="mt-4 text-base leading-7 text-slate-600">Join independently or create an institution-managed workspace. Each path uses its own identity and authority rules.</p>
      </header>
      <section className="mt-10 grid gap-5 md:grid-cols-3">
        {paths.map(({ title, description, action, href, icon: Icon }) => (
          <article key={href} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><Icon className="h-6 w-6" /></div>
            <h2 className="mt-5 text-lg font-bold text-slate-900">{title}</h2>
            <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{description}</p>
            <Link to={href} className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-indigo-700 hover:text-indigo-900">
              {action}<ArrowRight className="h-4 w-4" />
            </Link>
          </article>
        ))}
      </section>
      <p className="mt-8 text-sm text-slate-500">Already registered? <Link to="/login" className="font-semibold text-indigo-700">Sign in</Link>.</p>
    </div>
  </main>
);

export default OnboardingStart;
