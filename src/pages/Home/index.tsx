import { Link } from "react-router-dom";
import { Activity, ArrowRight, CalendarDays, Camera, Check, ClipboardCheck, FileText, FolderKanban, Mail, MapPin, MessageCircle, Phone, Send, Sparkles, Users } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

const contactAddress = "5/620 F-4, Krishna Nagar Housing Board, Kovilpatti, Thoothukudi, Tamil Nadu 628502";

function Home() {
  const reduceMotion = useReducedMotion();
  return (
    <main className="home-page">
      <motion.nav className="home-nav" aria-label="Main navigation" initial={reduceMotion ? false : { y: -24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.55, ease: "easeOut" }}>
        <Link className="home-brand" to="/" aria-label="WorkSphere home">
          <span className="home-brand-mark">W</span>
          <span>WorkSphere</span>
        </Link>
        <div className="home-nav-links">
          <a href="#about">About</a>
          <a href="#workflow">How it works</a>
          <a href="#features">Features</a>
          <a href="#contact">Contact</a>
        </div>
        <Link className="home-login-link" to="/login">Log in</Link>
      </motion.nav>

      <section className="hero-section" id="top">
        <motion.div className="hero-content" initial={reduceMotion ? false : { opacity: 0, x: -34 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.12, ease: "easeOut" }}>
          <span className="hero-badge"><Sparkles size={14} /> AI EMPLOYEE PERFORMANCE & ANALYTICS</span>
          <h1>
            Track performance.<br />
            Support your people.<br />
            <span>Grow with insight.</span>
          </h1>
          <p>
            Turn employee metrics into clear insights. Track progress, explore
            team trends, and ask WorkSphere AI questions grounded in your data.
          </p>
          <div className="hero-actions">
            <Link className="primary-button home-cta" to="/register">
              Create workspace <ArrowRight size={17} />
            </Link>
            <a className="secondary-button home-cta" href="#features">Explore features</a>
          </div>
          <div className="hero-proof"><Check size={16} /> Insights based on your workspace’s employee data</div>
        </motion.div>

        <motion.div className="hero-preview" aria-label="Illustrative WorkSphere employee performance dashboard preview" initial={reduceMotion ? false : { opacity: 0, x: 34, scale: 0.97 }} animate={{ opacity: 1, x: 0, scale: 1, y: reduceMotion ? 0 : [0, -8, 0] }} transition={reduceMotion ? { duration: 0.65, delay: 0.2 } : { opacity: { duration: 0.65, delay: 0.2 }, x: { duration: 0.65, delay: 0.2 }, scale: { duration: 0.65, delay: 0.2 }, y: { duration: 5, repeat: Infinity, ease: "easeInOut" } }}>
          <div className="dashboard-card">
            <div className="card-header">
              <div><small>PEOPLE INTELLIGENCE · PREVIEW</small><h3>Performance overview</h3></div>
              <span className="status-dot" />
            </div>
            <div className="stats-grid">
              <motion.div className="stat-card" whileHover={reduceMotion ? undefined : { y: -4, borderColor: "#93c5fd" }} transition={{ duration: 0.2 }}><small>Employees</small><strong>—</strong></motion.div>
              <motion.div className="stat-card" whileHover={reduceMotion ? undefined : { y: -4, borderColor: "#93c5fd" }} transition={{ duration: 0.2 }}><small>Avg. score</small><strong>—</strong></motion.div>
              <motion.div className="stat-card" whileHover={reduceMotion ? undefined : { y: -4, borderColor: "#93c5fd" }} transition={{ duration: 0.2 }}><small>Attention</small><strong>—</strong></motion.div>
            </div>
            <div className="progress-section">
              <div><span>Performance metrics</span><span>0–100</span></div>
              <div className="preview-metric-bars" aria-hidden="true">{[65, 88, 72, 96, 80].map((height, index) => <motion.i key={index} style={{ height: `${height}%`, transformOrigin: "bottom" }} initial={reduceMotion ? false : { scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.7, delay: 0.55 + index * 0.1, ease: "easeOut" }} />)}</div>
            </div>
            <div className="preview-activity">
              <span className="preview-activity-icon"><Sparkles size={16} /></span>
              <span><strong>AI-assisted insights</strong><small>Summaries based on recorded team metrics</small></span>
              <span className="preview-avatar"><Activity size={15} /></span>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="landing-intro" id="about">
        <span className="section-kicker">ABOUT WORKSPHERE</span>
        <h2>A clearer picture of performance starts with better data.</h2>
        <p>
          WorkSphere helps managers organize employee profiles, review five
          performance metrics, and understand changes over time. Dashboards and
          AI summaries make the signals easier to explore while keeping the
          underlying employee data in your account’s workspace.
        </p>
      </section>

      <section className="landing-workflow" id="workflow">
        <div className="landing-section-heading">
          <span className="section-kicker">A SIMPLE PERFORMANCE CYCLE</span>
          <h2>From employee records to a clearer next step.</h2>
          <p>Bring your team’s information together, then use it to guide thoughtful check-ins and planning.</p>
        </div>
        <div className="workflow-grid">
          <motion.article className="workflow-card" initial={reduceMotion ? false : { opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.45 }}>
            <span className="workflow-number">01</span><span className="feature-icon"><Users size={22} /></span>
            <h3>Build your employee workspace</h3>
            <p>Add profiles with roles, departments, joining dates, and the metrics your team uses.</p>
          </motion.article>
          <motion.article className="workflow-card" initial={reduceMotion ? false : { opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.45, delay: 0.1 }}>
            <span className="workflow-number">02</span><span className="feature-icon"><ClipboardCheck size={22} /></span>
            <h3>Connect work to progress</h3>
            <p>Assign tasks to employees and follow completion alongside attendance, productivity, quality, and teamwork.</p>
          </motion.article>
          <motion.article className="workflow-card" initial={reduceMotion ? false : { opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.45, delay: 0.2 }}>
            <span className="workflow-number">03</span><span className="feature-icon"><Sparkles size={22} /></span>
            <h3>Explore trends with AI</h3>
            <p>Review dashboards and ask WorkSphere AI questions about the performance data in your workspace.</p>
          </motion.article>
        </div>
        <div className="metric-note"><strong>One transparent score</strong><span>The overall score is the equally weighted average of attendance, productivity, task completion, quality, and teamwork.</span></div>
      </section>

      <section className="landing-features" id="features">
        <div className="landing-section-heading">
          <span className="section-kicker">PEOPLE DATA, MADE USEFUL</span>
          <h2>From employee records to practical insight.</h2>
        </div>
        <div className="feature-grid">
          <motion.article className="feature-card" initial={reduceMotion ? false : { opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.25 }} whileHover={reduceMotion ? undefined : { y: -6, boxShadow: "0 18px 36px rgba(37,99,235,.12)" }} transition={{ duration: 0.45 }}>
            <span className="feature-icon"><Users size={22} /></span>
            <h3>Employee profiles</h3>
            <p>Keep employee details, departments, roles and status organized in one workspace.</p>
          </motion.article>
          <motion.article className="feature-card" initial={reduceMotion ? false : { opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.25 }} whileHover={reduceMotion ? undefined : { y: -6, boxShadow: "0 18px 36px rgba(37,99,235,.12)" }} transition={{ duration: 0.45, delay: 0.08 }}>
            <span className="feature-icon"><Check size={22} /></span>
            <h3>Five performance metrics</h3>
            <p>Review attendance, productivity, task completion, quality and teamwork on a shared 0–100 scale.</p>
          </motion.article>
          <motion.article className="feature-card" initial={reduceMotion ? false : { opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.25 }} whileHover={reduceMotion ? undefined : { y: -6, boxShadow: "0 18px 36px rgba(37,99,235,.12)" }} transition={{ duration: 0.45, delay: 0.16 }}>
            <span className="feature-icon"><Activity size={22} /></span>
            <h3>Analytics and trends</h3>
            <p>Compare performance across employees and departments, and follow monthly changes.</p>
          </motion.article>
          <motion.article className="feature-card" initial={reduceMotion ? false : { opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.25 }} whileHover={reduceMotion ? undefined : { y: -6, boxShadow: "0 18px 36px rgba(37,99,235,.12)" }} transition={{ duration: 0.45, delay: 0.24 }}>
            <span className="feature-icon"><Sparkles size={22} /></span>
            <h3>WorkSphere AI Assistant</h3>
            <p>Ask questions about team metrics and get data-based summaries when AI service is available.</p>
          </motion.article>
        </div>
      </section>

      <section className="landing-tools">
        <div className="landing-section-heading">
          <span className="section-kicker">MORE THAN A DASHBOARD</span>
          <h2>Keep everyday team work connected.</h2>
          <p>Alongside performance insights, WorkSphere brings the practical tools teams use to plan and communicate.</p>
        </div>
        <div className="tools-grid">
          <motion.article className="tool-card" initial={reduceMotion ? false : { opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.25 }} whileHover={reduceMotion ? undefined : { y: -5 }}><span className="tool-icon"><FolderKanban size={21} /></span><div><h3>Projects and tasks</h3><p>Set owners, priorities, due dates, and statuses; see work move from to-do to completion.</p></div></motion.article>
          <motion.article className="tool-card" initial={reduceMotion ? false : { opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ delay: 0.08 }} whileHover={reduceMotion ? undefined : { y: -5 }}><span className="tool-icon"><FileText size={21} /></span><div><h3>Shared documents</h3><p>Upload and manage work files in your account’s workspace.</p></div></motion.article>
          <motion.article className="tool-card" initial={reduceMotion ? false : { opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ delay: 0.16 }} whileHover={reduceMotion ? undefined : { y: -5 }}><span className="tool-icon"><Send size={21} /></span><div><h3>Team communication</h3><p>Message workspace employees and keep project conversations close to the work.</p></div></motion.article>
          <motion.article className="tool-card" initial={reduceMotion ? false : { opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ delay: 0.24 }} whileHover={reduceMotion ? undefined : { y: -5 }}><span className="tool-icon"><CalendarDays size={21} /></span><div><h3>Schedules and reminders</h3><p>Use the calendar and notifications to keep important dates and updates visible.</p></div></motion.article>
        </div>
      </section>

      <section className="landing-contact" id="contact">
        <div>
          <span className="section-kicker">CONTACT</span>
          <h2>Make employee performance easier to understand.</h2>
          <p>Explore WorkSphere’s people analytics and AI-assisted performance insights.</p>
        </div>
        <div className="contact-card">
          <strong>Start a conversation</strong>
          <p>We’d be glad to hear from you.</p>
          <div className="contact-details-list">
            <a href="mailto:karthiklatha789@gmail.com"><Mail size={17} /><span>karthiklatha789@gmail.com</span></a>
            <a href="tel:+919345395524"><Phone size={17} /><span>+91 93453 95524</span></a>
            <a href="https://wa.me/919345395524" target="_blank" rel="noreferrer"><MessageCircle size={17} /><span>WhatsApp</span></a>
            <a href={`https://maps.google.com/?q=${encodeURIComponent(contactAddress)}`} target="_blank" rel="noreferrer"><MapPin size={17} /><span>{contactAddress}</span></a>
            <a href="https://www.instagram.com/_pradeep_karthikeyan/" target="_blank" rel="noreferrer"><Camera size={17} /><span>@_pradeep_karthikeyan</span></a>
            <a href="https://github.com/pradeep312205" target="_blank" rel="noreferrer"><span className="contact-social-badge">GH</span><span>github.com/pradeep312205</span></a>
            <a href="https://www.linkedin.com/in/pradeep-k-79a979320" target="_blank" rel="noreferrer"><span className="contact-social-badge">in</span><span>linkedin.com/in/pradeep-k-79a979320</span></a>
          </div>
          <Link to="/register" className="primary-button home-cta">Create your workspace <ArrowRight size={17} /></Link>
        </div>
      </section>

      <footer className="home-footer">
        <Link className="home-brand" to="/">
          <span className="home-brand-mark">W</span><span>WorkSphere</span>
        </Link>
        <span>Plan together. Make progress.</span>
        <a href="#top">Back to top ↑</a>
      </footer>
    </main>
  );
}

export default Home;
