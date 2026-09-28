import mongoose from 'mongoose'

// Repas à organiser : un sondage de dates (façon Doodle) auprès d'une liste d'invités, qui votent
// sans compte depuis un lien public (token). Le repas (midi ou soir) est choisi par l'organisateur ;
// à la clôture, la date retenue crée les invités du repas et un événement d'agenda.
const mealPollSchema = new mongoose.Schema({
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', index: true, required: true },
  id: { type: Number, required: true },
  // Jeton opaque de la page publique de vote (/sondage/<token>)
  token: { type: String, required: true, unique: true },
  title: { type: String, required: true, trim: true },
  slot: { type: String, enum: ['lunch', 'dinner'], default: 'dinner' },
  note: { type: String, default: '', trim: true },
  guests: [{
    _id: false,
    id: { type: Number, required: true },
    name: { type: String, required: true, trim: true },
    // Nombre de personnes sur cette ligne (un couple = 2) : une seule réponse, plusieurs couverts
    count: { type: Number, default: 1, min: 1, max: 20 },
    comment: { type: String, default: '', trim: true },
    votedAt: { type: Date, default: null }
  }],
  dates: { type: [String], default: [] }, // YYYY-MM-DD, triées
  votes: [{
    _id: false,
    guestId: { type: Number, required: true },
    date: { type: String, required: true },
    answer: { type: String, enum: ['yes', 'maybe', 'no'], required: true }
  }],
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  chosenDate: { type: String, default: null },
  // Créés à la clôture, supprimés à la réouverture
  createdGuestIds: { type: [Number], default: [] },
  eventId: { type: Number, default: null },
  createdBy: { type: Number, default: null }
}, { timestamps: true })

mealPollSchema.index({ familyId: 1, id: 1 }, { unique: true })

export default mongoose.model('MealPoll', mealPollSchema)
