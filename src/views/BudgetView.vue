<template>
  <div class="budget-view">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">
          <Wallet :size="28" class="text-emerald" />
          <span>Budget & Dépenses Partagées</span>
        </h1>
        <p class="page-subtitle">Suivez les achats communs et équilibrez les comptes entre membres de la famille.</p>
      </div>

      <button @click="showAddModal = true" class="btn btn-primary">
        <Plus :size="18" />
        <span>Ajouter une Dépense</span>
      </button>
    </div>

    <!-- Metrics Breakdown Grid -->
    <div class="grid-3 margin-bottom-lg">
      <div class="glass-card budget-summary-card">
        <span class="card-label">Dépenses Totales ce Mois</span>
        <div class="total-amount">{{ store.totalExpenses.toFixed(2) }} €</div>
        <span class="card-subtext">{{ store.expenses.length }} transactions enregistrées</span>
      </div>

      <div 
        v-for="member in store.members" 
        :key="member.id"
        class="glass-card payer-card"
      >
        <div class="payer-header">
          <span class="avatar-lg">{{ member.avatar }}</span>
          <div class="payer-info">
            <strong>{{ member.name }}</strong>
            <span>{{ member.role }}</span>
          </div>
        </div>

        <div class="payer-amount-box">
          <span class="payer-amount-label">Avancé :</span>
          <span class="payer-amount-val">{{ getPayerTotal(member.id).toFixed(2) }} €</span>
        </div>
      </div>
    </div>

    <!-- Expense History Table / List -->
    <div class="glass-card section-card">
      <div class="section-card-header">
        <h2>Historique des Opérations</h2>
        <span class="badge badge-emerald">Trié par date</span>
      </div>

      <div class="expenses-table-wrapper">
        <table class="expenses-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Intitulé</th>
              <th>Catégorie</th>
              <th>Payé par</th>
              <th>Montant</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="expense in store.expenses" :key="expense.id">
              <td class="date-cell">{{ formatDate(expense.date) }}</td>
              <td class="title-cell">
                <strong>{{ expense.title }}</strong>
              </td>
              <td>
                <span class="badge badge-indigo">{{ expense.category }}</span>
              </td>
              <td>
                <div class="payer-pill">
                  <span>{{ getPayerAvatar(expense.payerId) }}</span>
                  <span>{{ getPayerName(expense.payerId) }}</span>
                </div>
              </td>
              <td class="amount-cell">{{ expense.amount.toFixed(2) }} €</td>
              <td>
                <button @click="store.deleteExpense(expense.id)" class="btn-delete" title="Supprimer">
                  <Trash2 :size="16" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="store.expenses.length === 0" class="empty-state">
          Aucune dépense enregistrée.
        </div>
      </div>
    </div>

    <!-- Modal Ajouter Dépense -->
    <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Nouvelle Dépense</h3>
          <button @click="showAddModal = false" class="btn-close">&times;</button>
        </div>

        <form @submit.prevent="handleAddExpense">
          <div class="form-group">
            <label class="form-label">Description de la dépense</label>
            <input 
              v-model="newExpense.title" 
              type="text" 
              required 
              placeholder="ex: Courses Carrefour, Facture Électricité..."
              class="form-input" 
            />
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Montant (€)</label>
              <input 
                v-model.number="newExpense.amount" 
                type="number" 
                step="0.01" 
                required 
                placeholder="0.00"
                class="form-input" 
              />
            </div>

            <div class="form-group">
              <label class="form-label">Payé par</label>
              <select v-model="newExpense.payerId" class="form-select">
                <option v-for="m in store.members" :key="m.id" :value="m.id">
                  {{ m.avatar }} {{ m.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Catégorie</label>
              <select v-model="newExpense.category" class="form-select">
                <option value="Alimentation">Alimentation</option>
                <option value="Logement & Énergie">Logement & Énergie</option>
                <option value="Activités & Sports">Activités & Sports</option>
                <option value="Loisirs">Loisirs</option>
                <option value="Santé">Santé</option>
                <option value="Autre">Autre</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Date</label>
              <input v-model="newExpense.date" type="date" required class="form-input" />
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" @click="showAddModal = false" class="btn btn-secondary">Annuler</button>
            <button type="submit" class="btn btn-primary">Ajouter la dépense</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useFamilyStore } from '../stores/familyStore'
import { Wallet, Plus, Trash2 } from '@lucide/vue'

const store = useFamilyStore()
const showAddModal = ref(false)

const newExpense = ref({
  title: '',
  amount: null,
  payerId: store.members[0]?.id || 1,
  category: 'Alimentation',
  date: new Date().toISOString().split('T')[0]
})

const getPayerTotal = (payerId) => {
  return store.expenses
    .filter(e => e.payerId === payerId)
    .reduce((acc, curr) => acc + curr.amount, 0)
}

const getPayerName = (id) => {
  const m = store.members.find(m => m.id === id)
  return m ? m.name : 'Membre'
}

const getPayerAvatar = (id) => {
  const m = store.members.find(m => m.id === id)
  return m ? m.avatar : '👤'
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

const handleAddExpense = () => {
  if (!newExpense.value.title.trim() || !newExpense.value.amount) return
  store.addExpense(newExpense.value)
  showAddModal.value = false
  newExpense.value = {
    title: '',
    amount: null,
    payerId: store.members[0]?.id || 1,
    category: 'Alimentation',
    date: new Date().toISOString().split('T')[0]
  }
}
</script>

<style scoped>
.text-emerald { color: var(--accent-secondary); }
.margin-bottom-lg { margin-bottom: 2rem; }

.budget-summary-card {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.card-label {
  font-size: 0.825rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.total-amount {
  font-size: 2.2rem;
  font-weight: 800;
  color: var(--accent-secondary);
  line-height: 1.1;
  margin: 0.25rem 0;
}

.card-subtext {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.payer-card {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.payer-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.avatar-lg { font-size: 1.75rem; }

.payer-info {
  display: flex;
  flex-direction: column;
}

.payer-info strong { font-size: 0.95rem; }
.payer-info span { font-size: 0.75rem; color: var(--text-muted); }

.payer-amount-box {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.payer-amount-label { font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); }
.payer-amount-val { font-size: 1.1rem; font-weight: 800; color: var(--text-primary); }

.section-card { padding: 1.5rem; }
.section-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color);
}

/* Table styling */
.expenses-table-wrapper {
  overflow-x: auto;
}

.expenses-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.expenses-table th {
  padding: 0.85rem 1rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  border-bottom: 1px solid var(--border-color);
}

.expenses-table td {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  font-size: 0.9rem;
}

.amount-cell {
  font-weight: 800;
  color: var(--accent-secondary);
}

.payer-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 600;
}

.btn-delete {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
}
.btn-delete:hover { color: var(--accent-rose); }

.empty-state { padding: 2rem; text-align: center; color: var(--text-muted); }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.btn-close { background: none; border: none; font-size: 1.5rem; color: var(--text-muted); cursor: pointer; }
.modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; }
</style>
