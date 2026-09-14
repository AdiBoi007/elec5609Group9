import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { BrandLogo } from "../components/BrandLogo";
import {
  AI_DATA_USES,
  PRIVACY_CONTACT_EMAIL,
  PRIVACY_NOTICE_VERSION,
  PROCESSORS,
} from "../content/privacy";

const sections = [
  ["who-we-are", "Who we are"],
  ["what-we-collect", "What we collect"],
  ["why", "Why we collect it"],
  ["ai", "How AI features use your data"],
  ["processors", "Who else processes your data"],
  ["overseas", "Storage outside Australia"],
  ["choices", "Your choices"],
  ["security", "Security and limitations"],
  ["medical", "Not medical advice"],
  ["changes", "Changes to this policy"],
  ["contact", "Contact"],
] as const;

const lastUpdated = new Date(`${PRIVACY_NOTICE_VERSION}T00:00:00`).toLocaleDateString("en-AU", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 border-t border-line pt-8">
      <h2 className="text-xl font-bold tracking-[-0.02em] text-ink">{title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-7 text-muted">{children}</div>
    </section>
  );
}

// A real table from the sm breakpoint up; stacked cards below it so phones never scroll sideways.
function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border border-line sm:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-muted text-xs font-bold uppercase tracking-[.08em] text-muted">
            <tr>{head.map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((cells, index) => (
              <tr key={index} className="align-top">
                {cells.map((cell, cellIndex) => (
                  <td key={cellIndex} className={`px-4 py-3 leading-6 ${cellIndex === 0 ? "whitespace-nowrap font-semibold text-ink" : "text-muted"}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 sm:hidden">
        {rows.map((cells, index) => (
          <dl key={index} className="rounded-2xl border border-line p-4 text-sm leading-6">
            <dt className="font-semibold text-ink">{cells[0]}</dt>
            {cells.slice(1).map((cell, cellIndex) => (
              <dd key={cellIndex} className="mt-1 text-muted">
                {cells.length > 2 && <span className="mr-1 text-xs font-bold uppercase tracking-[.08em]">{head[cellIndex + 1]}:</span>}
                {cell}
              </dd>
            ))}
          </dl>
        ))}
      </div>
    </>
  );
}

export default function PrivacyPage() {
  const mail = <a className="font-semibold text-ink underline underline-offset-2" href={`mailto:${PRIVACY_CONTACT_EMAIL}`}>{PRIVACY_CONTACT_EMAIL}</a>;
  return (
    <div className="min-h-screen bg-canvas px-5 py-10 text-ink md:px-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-4">
          <BrandLogo className="text-lg text-ink" markClassName="size-9" />
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
            <ArrowLeft size={15} />
            Back to Circle Health
          </Link>
        </div>

        <header className="mt-12">
          <p className="text-sm font-semibold text-violet">Privacy</p>
          <h1 className="mt-3 text-[40px] font-bold leading-none tracking-[-0.05em]">Privacy Policy</h1>
          <p className="mt-4 text-sm text-muted">Last updated {lastUpdated} · Version {PRIVACY_NOTICE_VERSION}</p>
          <p className="mt-6 text-base leading-7 text-muted">
            This policy explains what Circle Health collects, where it is kept, who else handles it, and the choices you have.
          </p>
        </header>

        <nav aria-label="Policy sections" className="mt-8 rounded-2xl border border-line bg-surface p-5">
          <p className="text-xs font-bold uppercase tracking-[.1em] text-muted">On this page</p>
          <ol className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            {sections.map(([id, title]) => (
              <li key={id}><a href={`#${id}`} className="font-medium text-ink hover:underline">{title}</a></li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 space-y-10">
          <Section id="who-we-are" title="Who we are">
            <p>
              Circle Health is a student project built for ELEC5619 at the University of Sydney. It is not a commercial product
              and it is not a medical service. The project team is responsible for how your data is handled in the app.
            </p>
          </Section>

          <Section id="what-we-collect" title="What we collect">
            <p><strong className="text-ink">Account details.</strong> Your email address and name. Your password is handled by our sign-in provider and we never see it.</p>
            <p>
              <strong className="text-ink">Health information you enter.</strong> Your profile (age, gender, height, weight, activity level and
              fitness goal), your calculated targets, and the meals, workouts, water, sleep and body measurements you log. It also
              includes your goals, reminders, generated meal and workout plans, grocery lists, and your conversations with Ask Circle.
            </p>
            <p>
              <strong className="text-ink">Dietary and cultural preferences.</strong> Food allergies, intolerances and dietary restrictions are
              health information, and cultural preferences can reflect religious practice. We treat them as sensitive and collect them
              only so meal suggestions and plans fit you.
            </p>
            <p>
              <strong className="text-ink">What we do not collect.</strong> We use no analytics, advertising identifiers or third-party tracking.
              We do not collect your location or contacts. Barcode scanning uses your camera in the browser; images are not uploaded.
              Your browser stores your sign-in session and your theme and sidebar preferences.
            </p>
          </Section>

          <Section id="why" title="Why we collect it">
            <p>
              We use your information to calculate your nutrition targets, show your progress, keep your records, and generate
              suggestions and plans. We do not sell your information or use it for advertising.
            </p>
          </Section>

          <Section id="ai" title="How AI features use your data">
            <p>
              Circle Health can use OpenAI to answer questions and generate plans. <strong className="text-ink">Nothing is sent to OpenAI unless you
              choose to allow AI features</strong>, and you can turn them off at any time in Settings. Without AI, these features use
              Circle Health's built-in templates instead.
            </p>
            <p>When AI features are allowed and you use one, the following is sent with that request:</p>
            <Table
              head={["Feature", "What is sent"]}
              rows={AI_DATA_USES.map((use) => [use.feature, <>{use.sent}{use.note && <span className="mt-1 block text-xs font-semibold">{use.note}</span>}</>])}
            />
            <p>
              <strong className="text-ink">Your name, email and account ID are never sent.</strong> This makes the data pseudonymous, not anonymous:
              anything you type yourself, such as a question, meal name or training preference, is sent as written. Please avoid
              typing details you would not want a third party to process.
            </p>
            <p>
              OpenAI handles this data under its own terms and may keep it for a limited period. Deleting a conversation in Circle
              Health removes it from our database but cannot recall what was already sent.
            </p>
          </Section>

          <Section id="processors" title="Who else processes your data">
            <p>These services help run Circle Health. Each receives only what it needs for its purpose.</p>
            <Table head={["Service", "Purpose", "Location"]} rows={PROCESSORS.map((item) => [item.name, item.purpose, item.location])} />
          </Section>

          <Section id="overseas" title="Storage outside Australia">
            <p>
              Your account and health records are stored in Singapore. If you allow AI features, the data described above is
              processed by OpenAI in the United States. By using Circle Health you agree to your information being stored and
              processed outside Australia.
            </p>
          </Section>

          <Section id="choices" title="Your choices">
            <ul className="list-disc space-y-2 pl-5">
              <li><strong className="text-ink">Access and export.</strong> Download a copy of your records from Settings → Data.</li>
              <li><strong className="text-ink">Correct.</strong> Update your profile at any time, and edit or delete entries you have logged.</li>
              <li><strong className="text-ink">Delete conversations.</strong> Delete one conversation, or all of them from Settings → Data.</li>
              <li><strong className="text-ink">AI features.</strong> Allow or turn off AI features in Settings. The rest of Circle Health works without them.</li>
              <li><strong className="text-ink">Delete your account.</strong> Email {mail} from the address you signed up with and we will delete your account and records.</li>
            </ul>
          </Section>

          <Section id="security" title="Security and limitations">
            <p>
              Data is sent over encrypted connections and stored in an encrypted database. Access is limited to the project team,
              who can technically read stored records to operate and fix the app.
            </p>
            <p>
              As a university project, Circle Health has no guaranteed availability or long-term retention. Deleted records are
              removed from the live database, and copies may remain in our database provider's backups for a limited time.
            </p>
          </Section>

          <Section id="medical" title="Not medical advice">
            <p>
              Circle Health provides general fitness and wellness information. It does not diagnose conditions and is not a
              substitute for advice from a qualified health professional.
            </p>
          </Section>

          <Section id="changes" title="Changes to this policy">
            <p>
              When this policy changes in a way that affects you, we update the version above and ask you to review and agree
              the next time you open the app.
            </p>
          </Section>

          <Section id="contact" title="Contact">
            <p>
              For questions, access or correction requests, account deletion or complaints, email {mail}. We aim to reply within
              10 business days.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
