import { ref } from 'vue'

const isVisible = ref(false)
const modalOptions = ref({
  title: 'Confirmation',
  message: '',
  description: '',
  warning: '',
  confirmText: 'Confirmer',
  cancelText: 'Annuler',
  type: 'danger', // 'danger' | 'warning' | 'primary'
  resolve: null
})

export function useConfirm() {
  const confirm = ({
    title = 'Confirmation',
    message = 'Êtes-vous sûr de vouloir continuer ?',
    description = '',
    warning = '',
    confirmText = 'Confirmer',
    cancelText = 'Annuler',
    type = 'danger'
  } = {}) => {
    return new Promise((resolve) => {
      modalOptions.value = {
        title,
        message,
        description,
        warning,
        confirmText,
        cancelText,
        type,
        resolve
      }
      isVisible.value = true
    })
  }

  const handleConfirm = () => {
    if (modalOptions.value.resolve) {
      modalOptions.value.resolve(true)
    }
    isVisible.value = false
  }

  const handleCancel = () => {
    if (modalOptions.value.resolve) {
      modalOptions.value.resolve(false)
    }
    isVisible.value = false
  }

  return {
    isVisible,
    modalOptions,
    confirm,
    handleConfirm,
    handleCancel
  }
}
