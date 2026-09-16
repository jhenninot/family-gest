#!/bin/bash
# Lancé par postStartCommand à chaque démarrage du codespace.
# Démarre le serveur dev (backend :5000 + frontend :5173) en arrière-plan,
# sans bloquer la fin du hook de démarrage du codespace.
set -e
cd "$(dirname "$0")/.."

mkdir -p /tmp/family-gest-logs

# Évite de relancer un second serveur si le hook est déclenché plusieurs fois
# (ex: reprise après pause) alors qu'une instance tourne déjà.
if pgrep -f "vite" > /dev/null 2>&1; then
  echo "Dev server déjà en cours d'exécution, on ne relance pas."
  exit 0
fi

nohup npm run dev > /tmp/family-gest-logs/dev.log 2>&1 &
disown
echo "Dev server démarré (logs: /tmp/family-gest-logs/dev.log)"
