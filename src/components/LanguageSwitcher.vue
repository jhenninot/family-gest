<template>
  <div class="language-switcher" role="group" :aria-label="t('common.language.title')">
    <button
      v-for="lang in SUPPORTED_LOCALES"
      :key="lang"
      type="button"
      class="language-switcher-btn"
      :class="{ active: currentLocale === lang }"
      :aria-pressed="currentLocale === lang"
      :title="LOCALE_LABELS[lang]"
      @click="setLocale(lang)"
    >
      {{ lang.toUpperCase() }}
    </button>
  </div>
</template>

<script setup>
// Choix de la langue sur les écrans affichés avant la connexion (connexion, invitation, mot de
// passe). Le choix est mémorisé sur l'appareil, puis enregistré sur le compte à la connexion
// s'il n'a pas encore de langue.
import { useI18n } from 'vue-i18n'
import { SUPPORTED_LOCALES, LOCALE_LABELS, currentLocale, setLocale } from '../i18n'

const { t } = useI18n()
</script>

<style scoped>
.language-switcher {
  display: inline-flex;
  gap: 0.25rem;
  justify-content: center;
}

.language-switcher-btn {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  border-radius: 999px;
  padding: 0.2rem 0.6rem;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.language-switcher-btn:hover {
  color: var(--text-primary);
  border-color: var(--accent-primary);
}

.language-switcher-btn.active {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: #fff;
}
</style>
