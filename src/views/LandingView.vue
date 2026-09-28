<template>
  <div class="landing">
    <p v-if="state === 'loading'" class="landing-loading">{{ t('common.loading') }}</p>

    <!-- Lien inconnu ou page désactivée : rien ne laisse deviner son existence -->
    <div v-else-if="state === 'missing'" class="landing-missing">
      <p>{{ t('landing.notFound') }}</p>
    </div>

    <template v-else>
      <!-- En-tête -->
      <header class="landing-hero">
        <div class="landing-brand">
          <span class="landing-logo"><BrandLogo :size="26" /></span>
          <span>FamilyGest</span>
        </div>

        <div class="landing-hero-grid">
          <div class="landing-hero-text">
            <span class="landing-pill">{{ t('landing.pill') }}</span>
            <h1>{{ t('landing.title') }}</h1>
            <p class="landing-lead">{{ t('landing.lead') }}</p>
            <div class="landing-cta-row">
              <button v-if="contactHref" type="button" class="landing-cta" @click="contact">
                <MessageCircle :size="20" /> {{ t('landing.contact') }}
              </button>
              <span class="landing-cta-note">{{ t('landing.inviteOnly') }}</span>
            </div>
          </div>

          <!-- Aperçu d'un téléphone (données d'exemple) -->
          <div class="landing-phone" aria-hidden="true">
            <div class="phone-notch"></div>
            <div class="phone-card green">
              <span class="phone-label">🏠 {{ t('landing.demo.tonight') }}</span>
              <strong>{{ t('landing.demo.atTable') }}</strong>
              <span class="phone-sub">{{ t('landing.demo.guests') }}</span>
            </div>
            <div class="phone-card blue">
              <span class="phone-label">🔁 {{ t('landing.demo.custody') }}</span>
              <strong>{{ t('landing.demo.custodyKids') }}</strong>
              <span class="phone-sub">{{ t('landing.demo.custodyNext') }}</span>
            </div>
            <div class="phone-card rose">
              <span class="phone-label">🍽️ {{ t('landing.demo.menu') }}</span>
              <strong>{{ t('landing.demo.dish') }}</strong>
            </div>
            <div class="phone-card orange">
              <span class="phone-label">🗳️ {{ t('landing.demo.poll') }}</span>
              <strong>{{ t('landing.demo.pollTitle') }}</strong>
              <span class="phone-sub">{{ t('landing.demo.pollVotes') }}</span>
            </div>
            <div class="phone-card amber">
              <span class="phone-label">🛒 {{ t('landing.demo.shopping') }}</span>
              <strong>{{ t('landing.demo.shoppingItems') }}</strong>
            </div>
            <div class="phone-mic">🎙️</div>
          </div>
        </div>
      </header>

      <!-- Questions du quotidien -->
      <section class="landing-questions">
        <p v-for="q in QUESTIONS" :key="q" class="landing-question">« {{ t(`landing.questions.${q}`) }} »</p>
        <p class="landing-answer">{{ t('landing.questionsAnswer') }}</p>
      </section>

      <!-- Modules -->
      <section class="landing-section">
        <h2>{{ t('landing.featuresTitle') }}</h2>
        <div class="landing-features">
          <article v-for="f in FEATURES" :key="f.key" class="landing-feature">
            <span class="feature-icon" :style="{ background: f.color }">{{ f.icon }}</span>
            <h3>{{ t(`landing.features.${f.key}.title`) }}</h3>
            <p>{{ t(`landing.features.${f.key}.text`) }}</p>
          </article>
        </div>
      </section>

      <!-- Garde alternée : présences habituelles sur deux semaines -->
      <section class="landing-section">
        <div class="landing-custody">
          <div class="custody-text">
            <span class="landing-pill">🔁 {{ t('landing.custody.pill') }}</span>
            <h2>{{ t('landing.custody.title') }}</h2>
            <p>{{ t('landing.custody.text') }}</p>
            <ul class="custody-points">
              <li v-for="p in CUSTODY_POINTS" :key="p">✓ {{ t(`landing.custody.points.${p}`) }}</li>
            </ul>
          </div>
          <div class="custody-demo" aria-hidden="true">
            <div class="custody-who">👧 {{ t('landing.custody.child') }}</div>
            <div v-for="week in CUSTODY_WEEKS" :key="week.key" class="custody-week">
              <span class="custody-week-label">{{ t(`landing.custody.${week.key}`) }}</span>
              <div class="custody-days">
                <span v-for="(day, i) in dayLetters" :key="i" class="custody-day" :class="{ home: week.days[i] }">{{ day }}</span>
              </div>
            </div>
            <div class="custody-legend">
              <span><i class="dot home"></i>{{ t('landing.custody.home') }}</span>
              <span><i class="dot"></i>{{ t('landing.custody.away') }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Comment ça marche -->
      <section class="landing-section">
        <h2>{{ t('landing.stepsTitle') }}</h2>
        <ol class="landing-steps">
          <li v-for="(s, i) in STEPS" :key="s">
            <span class="step-num">{{ i + 1 }}</span>
            <div>
              <h3>{{ t(`landing.steps.${s}.title`) }}</h3>
              <p>{{ t(`landing.steps.${s}.text`) }}</p>
            </div>
          </li>
        </ol>
      </section>

      <!-- Vie privée -->
      <section class="landing-section landing-privacy">
        <span class="privacy-icon">🔒</span>
        <div>
          <h2>{{ t('landing.privacyTitle') }}</h2>
          <p>{{ t('landing.privacyText') }}</p>
        </div>
      </section>

      <!-- Appel final -->
      <section class="landing-final">
        <h2>{{ t('landing.finalTitle') }}</h2>
        <p>{{ contactHref ? t('landing.finalText') : t('landing.finalTextNoContact') }}</p>
        <button v-if="contactHref" type="button" class="landing-cta" @click="contact">
          <MessageCircle :size="20" /> {{ t('landing.contact') }}
        </button>
      </section>

      <footer class="landing-footer">FamilyGest</footer>
    </template>
  </div>
</template>

<script setup>
// Page de présentation de FamilyGest, à l'adresse secrète /decouvrir/<clé> (réglée par le Super
// Admin). Jamais indexée (robots.txt, meta et en-tête X-Robots-Tag). Bouton « Me contacter »
// seulement si le Super Admin l'active ; son lien n'est décodé qu'au clic (robots collecteurs).
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { MessageCircle } from '@lucide/vue'
import BrandLogo from '../components/BrandLogo.vue'
import { weekdayNames } from '../i18n/format'

const { t } = useI18n()
const route = useRoute()


const QUESTIONS = ['who', 'kids', 'what', 'shopping']
const CUSTODY_POINTS = ['rhythm', 'slots', 'exceptions']
// Semaine A : à la maison toute la semaine ; semaine B : seulement le mercredi
const CUSTODY_WEEKS = [
  { key: 'weekA', days: [true, true, true, true, true, true, true] },
  { key: 'weekB', days: [false, false, true, false, false, false, false] }
]
const dayLetters = computed(() => weekdayNames('narrow'))
const FEATURES = [
  { key: 'presence', icon: '🏠', color: 'linear-gradient(135deg, #10b981, #34d399)' },
  { key: 'meals', icon: '🍽️', color: 'linear-gradient(135deg, #f43f5e, #fb7185)' },
  { key: 'polls', icon: '🗳️', color: 'linear-gradient(135deg, #f97316, #fb923c)' },
  { key: 'shopping', icon: '🛒', color: 'linear-gradient(135deg, #f59e0b, #fbbf24)' },
  { key: 'tasks', icon: '✅', color: 'linear-gradient(135deg, #6366f1, #818cf8)' },
  { key: 'calendar', icon: '📅', color: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' },
  { key: 'voice', icon: '🎙️', color: 'linear-gradient(135deg, #0ea5e9, #38bdf8)' },
  { key: 'notifications', icon: '🔔', color: 'linear-gradient(135deg, #ec4899, #f472b6)' }
]
const STEPS = ['invite', 'install', 'organise']

const state = ref('loading')
const contactHref = ref(null)

onMounted(async () => {
  try {
    const res = await fetch(`/api/public/landing/${encodeURIComponent(String(route.params.key || ''))}`)
    if (!res.ok) throw new Error('missing')
    const body = await res.json()
    contactHref.value = body.contact || null
    state.value = 'ready'
  } catch {
    state.value = 'missing'
  }
})

const contact = () => {
  if (!contactHref.value) return
  const href = atob(contactHref.value)
  if (href.startsWith('mailto:')) window.location.href = href
  else window.open(href, '_blank', 'noopener')
}
</script>

<style scoped>
.landing {
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.landing-loading,
.landing-missing {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}

/* En-tête */
.landing-hero {
  padding: 1.25rem 1.25rem 3rem;
  background:
    radial-gradient(circle at 15% 20%, rgba(139, 92, 246, 0.22), transparent 45%),
    radial-gradient(circle at 85% 10%, rgba(249, 115, 22, 0.16), transparent 40%),
    var(--bg-primary);
}

.landing-brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  max-width: 1080px;
  margin: 0 auto 2rem;
  font-weight: 800;
  font-size: 1.15rem;
  color: var(--accent-primary);
}

.landing-logo {
  display: inline-flex;
  padding: 0.45rem;
  border-radius: 12px;
  color: #fff;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
}

.landing-hero-grid {
  max-width: 1080px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr;
  gap: 2.5rem;
  align-items: center;
}

@media (min-width: 860px) {
  .landing-hero-grid {
    grid-template-columns: 1.15fr 0.85fr;
  }
}

.landing-pill {
  display: inline-block;
  padding: 0.3rem 0.8rem;
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.12);
  color: var(--accent-primary);
  font-size: 0.82rem;
  font-weight: 700;
}

.landing-hero h1 {
  margin: 0.9rem 0 0.8rem;
  font-size: clamp(2rem, 6vw, 3.1rem);
  line-height: 1.12;
  letter-spacing: -0.02em;
}

.landing-lead {
  margin: 0;
  font-size: 1.08rem;
  line-height: 1.6;
  color: var(--text-secondary);
  max-width: 34rem;
}

.landing-cta-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.9rem;
  margin-top: 1.6rem;
}

.landing-cta {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.9rem 1.5rem;
  border: none;
  border-radius: 999px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  font-size: 1.02rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 10px 24px rgba(99, 102, 241, 0.35);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.landing-cta:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 30px rgba(99, 102, 241, 0.42);
}

.landing-cta-note {
  font-size: 0.85rem;
  color: var(--text-muted);
}

/* Téléphone d'exemple */
.landing-phone {
  position: relative;
  justify-self: center;
  width: min(290px, 100%);
  padding: 2.2rem 0.9rem 1.2rem;
  border-radius: 36px;
  background: var(--bg-secondary);
  border: 8px solid #1e1b4b;
  box-shadow: 0 30px 60px rgba(30, 27, 75, 0.25);
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.phone-notch {
  position: absolute;
  top: 0.6rem;
  left: 50%;
  width: 80px;
  height: 18px;
  margin-left: -40px;
  border-radius: 10px;
  background: #1e1b4b;
}

.phone-card {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.7rem 0.85rem;
  border-radius: 14px;
  background: var(--bg-tertiary);
  border-left: 4px solid;
}

.phone-card.green { border-color: #10b981; }
.phone-card.rose { border-color: #f43f5e; }
.phone-card.orange { border-color: #f97316; }
.phone-card.amber { border-color: #f59e0b; }
.phone-card.blue { border-color: #14b8a6; }

.phone-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.phone-card strong {
  font-size: 0.98rem;
}

.phone-sub {
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.phone-mic {
  align-self: flex-end;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  box-shadow: 0 8px 18px rgba(99, 102, 241, 0.4);
}

/* Questions du quotidien */
.landing-questions {
  max-width: 820px;
  margin: 0 auto;
  padding: 2.5rem 1.25rem;
  text-align: center;
}

.landing-question {
  margin: 0.3rem 0;
  font-size: clamp(1.05rem, 3.2vw, 1.3rem);
  font-weight: 600;
  color: var(--text-secondary);
  font-style: italic;
}

.landing-answer {
  margin: 1.2rem 0 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--accent-primary);
}

/* Sections */
.landing-section {
  max-width: 1080px;
  margin: 0 auto;
  padding: 2.5rem 1.25rem;
}

.landing-section h2,
.landing-final h2 {
  margin: 0 0 1.5rem;
  font-size: clamp(1.5rem, 4.5vw, 2rem);
  letter-spacing: -0.01em;
}

.landing-features {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 1rem;
}

.landing-feature {
  padding: 1.3rem;
  border-radius: 18px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
}

.feature-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 14px;
  font-size: 1.35rem;
}

.landing-feature h3 {
  margin: 0.85rem 0 0.4rem;
  font-size: 1.05rem;
}

.landing-feature p {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.55;
  color: var(--text-secondary);
}

/* Garde alternée */
.landing-custody {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.75rem;
  align-items: center;
  padding: 1.75rem;
  border-radius: 24px;
  background:
    radial-gradient(circle at 90% 10%, rgba(20, 184, 166, 0.16), transparent 50%),
    var(--bg-secondary);
  border: 1px solid var(--border-color);
}

@media (min-width: 860px) {
  .landing-custody {
    grid-template-columns: 1.1fr 0.9fr;
    padding: 2.25rem;
  }
}

.landing-custody .landing-pill {
  background: rgba(20, 184, 166, 0.14);
  color: #0d9488;
}

.custody-text h2 {
  margin: 0.8rem 0 0.6rem;
}

.custody-text p {
  margin: 0;
  line-height: 1.6;
  color: var(--text-secondary);
}

.custody-points {
  list-style: none;
  margin: 1rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-weight: 600;
  font-size: 0.95rem;
}

.custody-demo {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  padding: 1.2rem;
  border-radius: 18px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
}

.custody-who {
  font-weight: 700;
}

.custody-week-label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.custody-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.35rem;
}

.custody-day {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  max-height: 42px;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 700;
  background: var(--bg-tertiary);
  color: var(--text-muted);
}

.custody-day.home {
  background: linear-gradient(135deg, #14b8a6, #2dd4bf);
  color: #fff;
}

.custody-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.custody-legend .dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-right: 0.35rem;
  border-radius: 3px;
  background: var(--bg-tertiary);
  vertical-align: middle;
}

.custody-legend .dot.home {
  background: #14b8a6;
}

.landing-steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}

.landing-steps li {
  display: flex;
  gap: 0.9rem;
  padding: 1.2rem;
  border-radius: 18px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
}

.step-num {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  font-weight: 800;
}

.landing-steps h3 {
  margin: 0.3rem 0 0.35rem;
  font-size: 1.02rem;
}

.landing-steps p {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.55;
  color: var(--text-secondary);
}

.landing-privacy {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.landing-privacy h2 {
  margin-bottom: 0.5rem;
}

.landing-privacy p {
  margin: 0;
  line-height: 1.6;
  color: var(--text-secondary);
}

.privacy-icon {
  font-size: 2rem;
}

.landing-final {
  max-width: 820px;
  margin: 1rem auto 0;
  padding: 3rem 1.25rem;
  text-align: center;
}

.landing-final p {
  margin: 0 0 1.5rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

.landing-footer {
  padding: 2rem 1rem 2.5rem;
  text-align: center;
  font-size: 0.8rem;
  color: var(--text-muted);
}
</style>
