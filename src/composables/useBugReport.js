import { ref } from 'vue'

// Ouverture du formulaire « Signaler un bug » (BugReportModal, monté une fois dans App.vue),
// depuis l'aide « ? » ou le menu de l'avatar.
const isOpen = ref(false)

export function useBugReport () {
  return {
    isOpen,
    openBugReport: () => { isOpen.value = true },
    closeBugReport: () => { isOpen.value = false }
  }
}
