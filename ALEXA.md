# 🔊 Skill Alexa privée pour FamilyGest

Ce guide explique comment créer une skill Alexa **privée** qui permet d'ajouter à la voix, depuis vos enceintes Echo :

| Action | Exemple de phrase |
|---|---|
| Un événement dans l'agenda | « Alexa, demande à gestion famille d'ajouter dentiste mardi à 15 heures » |
| Des articles sur la liste de courses | « Alexa, demande à gestion famille d'acheter du lait, des œufs et deux baguettes » |
| Un plat au menu de la semaine | « Alexa, demande à gestion famille de mettre des lasagnes au dîner de jeudi » |
| Une absence | « Alexa, demande à gestion famille : Paul ne sera pas là demain midi » |
| Une présence exceptionnelle | « Alexa, demande à gestion famille : Léa sera là ce soir » |
| Un invité | « Alexa, demande à gestion famille : Mamie vient dîner samedi » |

« gestion famille » est le nom d'invocation par défaut : il se change dans FamilyGest (voir section 2). Évitez les noms inventés ou anglais comme « family gest », que la reconnaissance vocale française comprend mal.

La skill reste en **mode développement** : elle n'est pas publiée sur le magasin Alexa, ne passe pas par la certification d'Amazon et ne fonctionne que sur les enceintes rattachées à **votre** compte Amazon.

---

## 1. Prérequis

- FamilyGest est accessible depuis Internet en **HTTPS**, avec un certificat valide (Let's Encrypt via Nginx Proxy Manager, comme pour le connecteur Claude, voir `DOCKGE.md`). Amazon n'appelle que des adresses publiques en HTTPS sur le port 443 : une adresse locale (`192.168…`) ou en `http://` ne fonctionnera pas.
- Dans la console Super Admin › Configuration Globale, l'**URL publique** de FamilyGest est renseignée (c'est elle qui sert à construire l'adresse de la skill).
- Un compte développeur Amazon, créé gratuitement sur [developer.amazon.com](https://developer.amazon.com) avec **le même compte Amazon que vos enceintes Echo**.

Aucune règle supplémentaire n'est nécessaire dans Nginx Proxy Manager : la skill utilise l'adresse `/api/alexa/…` du même domaine que l'application. Le proxy doit simplement transmettre les requêtes telles quelles (les requêtes d'Amazon sont signées : un proxy qui modifierait leur contenu les ferait refuser).

## 2. Dans FamilyGest

Ouvrez **Administration** (réglages de la famille) › **Assistant vocal Alexa** :

1. Cliquez sur **Générer l'adresse de la skill** et copiez l'adresse affichée (elle ne sera plus jamais affichée en clair). Elle ressemble à `https://famille.mondomaine.fr/api/alexa/ma-famille/3f9c…`.
2. Si vous le souhaitez, changez le **nom d'invocation** (au moins deux mots français courants, par exemple « notre famille » ou « agenda familial ») et cliquez sur **Enregistrer**.
3. Cliquez sur **Télécharger le modèle de dialogue** : vous obtenez le fichier `familygest-alexa-fr-FR.json`, qui contient les phrases comprises par la skill et les prénoms de votre famille.

Les ajouts faits à la voix sont enregistrés au nom de la personne qui a généré l'adresse ; les autres membres reçoivent la notification habituelle, avec la mention « via Alexa ».

## 3. Dans la console développeur Amazon

Rendez-vous sur [developer.amazon.com/alexa/console/ask](https://developer.amazon.com/alexa/console/ask) :

1. **Create Skill**
   - Skill name : `Family Gest`
   - Primary locale : **French (FR)**
   - Type of experience : *Other* › Model : **Custom** › Hosting services : **Provision your own**
   - Template : **Start from Scratch**, puis **Create Skill**.
2. **Build › Interaction Model › JSON Editor** : glissez le fichier `familygest-alexa-fr-FR.json` dans l'éditeur (ou collez son contenu), cliquez sur **Save**, puis sur **Build skill**. La construction prend une à deux minutes.
3. **Build › Endpoint** :
   - Choisissez **HTTPS**.
   - Default Region : collez l'adresse copiée à l'étape 2.
   - Certificat SSL : **My development endpoint has a certificate from a trusted certificate authority**.
   - Cliquez sur **Save Endpoints**.
4. Onglet **Test** : passez le sélecteur *Skill testing is enabled in* sur **Development**. Vous pouvez essayer en tapant par exemple `demande à gestion famille d'acheter du lait`, puis vérifier que le lait apparaît dans FamilyGest.

C'est tout : la skill fonctionne aussitôt sur vos enceintes Echo (dans l'application Alexa, elle apparaît dans *Plus › Skills et jeux › Vos skills › Développeur*).

## 4. Utilisation

- En une phrase : « **Alexa, demande à gestion famille** de… » suivi de la demande. Alexa confirme puis se tait.
- En conversation : « **Alexa, ouvre gestion famille** », puis enchaînez les demandes ; Alexa répond « Autre chose ? » après chacune. Dites « c'est tout » ou « stop » pour terminer.
- S'il manque une information, Alexa la demande (« Pour quel jour ? », « Pour le déjeuner ou le dîner ? »). Sans jour précisé, les repas, présences et invités sont pour **aujourd'hui**.
- Les absences et présences se font toujours avec un **prénom** : « Paul ne sera pas là… ». Vous pouvez en indiquer plusieurs moments (« midi et soir », « toute la journée ») ; « Paul ne dort pas à la maison vendredi » concerne la nuit.
- **Courses** : évitez « à ma liste de courses », qu'Alexa a tendance à envoyer vers la liste d'achats d'Amazon. Préférez « d'**acheter** du lait », « qu'il faut du lait » ou « d'ajouter du lait **aux courses** ». En conversation (skill ouverte), « ajoute du lait » suffit toujours.
- Plusieurs articles ou invités d'un coup : « du lait, du beurre et des œufs », « Mamie et Papi ». Un article déjà présent sur la liste n'est pas ajouté en double ; les articles dictés vont dans le rayon « Autre ».
- « Alexa, demande à gestion famille de l'aide » donne des exemples.

Les absences longues (vacances…) ne sont pas encore gérées à la voix.

## 5. Entretien

- **Nouveau membre dans la famille** : retéléchargez le modèle de dialogue et réimportez-le (étape 3.2, puis *Build skill*) pour que son prénom soit bien reconnu. Entre-temps, la skill transmet déjà les prénoms à Alexa à chaque ouverture (« Alexa, ouvre gestion famille »).
- **Adresse compromise ou changement de responsable** : *Régénérer l'adresse* dans FamilyGest, puis collez la nouvelle dans *Build › Endpoint*. *Révoquer* coupe immédiatement l'accès.
- **Changer le nom d'invocation** : modifiez-le dans FamilyGest (Assistant vocal Alexa), retéléchargez le modèle et réimportez-le (étape 3.2, puis *Build skill*). Le modifier seulement dans la console Amazon fonctionne aussi, mais il serait écrasé au prochain réimport du modèle.

## 6. En cas de problème

| Symptôme | Piste |
|---|---|
| « Il y a eu un problème avec la réponse de la skill demandée » | Consultez les journaux du conteneur `familygest-app` (lignes `[Alexa]`). Vérifiez que l'adresse de l'endpoint est complète et n'a pas été régénérée depuis. |
| Rien n'arrive dans les journaux | Amazon n'atteint pas votre serveur : vérifiez l'accès HTTPS depuis l'extérieur et le certificat (l'adresse doit s'ouvrir sans avertissement dans un navigateur). |
| `[Alexa] Requête refusée` dans les journaux | La signature d'Amazon n'a pas pu être vérifiée : le proxy modifie probablement la requête, ou l'horloge du serveur est très décalée. |
| La demande part sur la liste d'achats Amazon ou une réponse d'Alexa sans rapport | Alexa n'a pas reconnu le nom d'invocation : vérifiez ce qu'elle a entendu dans l'application Alexa (*Paramètres › Confidentialité Alexa › Historique vocal*) et choisissez un nom plus simple à prononcer. Pour les courses, dites « d'acheter… » plutôt que « à ma liste de courses ». |
| Un prénom n'est pas compris | Retéléchargez et réimportez le modèle de dialogue (section 5). |
