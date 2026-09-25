import { ref } from 'vue'
import { t } from '../i18n'

const isVisible = ref(false)
const modalOptions = ref({
  title: '',
  message: '',
  description: '',
  warning: '',
  confirmText: '',
  cancelText: '',
  type: 'danger', // 'danger' | 'warning' | 'primary'
  resolve: null
})

export function useConfirm() {
  const confirm = ({
    title = t('confirm.title'),
    message = t('confirm.message'),
    description = '',
    warning = '',
    confirmText = t('confirm.confirm'),
    cancelText = t('common.cancel'),
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
