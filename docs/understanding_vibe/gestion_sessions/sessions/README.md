# Site Web - Système de Sessions Mistral Vibe

Ce dossier contient le site web synthétique pour le système de gestion de sessions de Mistral Vibe.

## Structure

```
resume_session/
└── website/
    ├── index.html    # Page principale
    ├── styles.css    # Styles CSS
    ├── script.js     # JavaScript interactif
    └── README.md     # Documentation détaillée du site
```

## Lancer le site

### Option 1 : Ouvrir directement le fichier (simple)
```bash
cd docs/understanding_vibe/resume_session/website
xdg-open index.html  # Linux
# open index.html      # macOS
# start index.html     # Windows
```

### Option 2 : Serveur local (recommandé)
```bash
cd docs/understanding_vibe/resume_session/website

# Avec Python (nécessite Python installé)
python -m http.server 8000
# Accessible à http://localhost:8000

# Avec uv (si disponible)
uv run python -m http.server 8000
```

### Option 3 : Autres outils
- Utilisez **VS Code** : Ouvrez `index.html` avec l'extension **Live Server**.
- Utilisez **Node.js** : `npx serve` ou `npx http-server`.

## Contenu du site

Le site inclut :
- **Hero Section** : Introduction visuelle.
- **Fonctionnalités** : 6 cartes des principales fonctionnalités.
- **Architecture** : Diagrammes d'architecture.
- **Exemples de code** : Extraits de code synthétiques.
- **Statistiques** : Graphiques et performances.
- **Commandes CLI** : Liste des commandes disponibles.

## Personnalisation

Pour modifier le site, éditez les fichiers dans `website/` :
- **Contenu** : Modifiez `index.html`.
- **Styles** : Modifiez `styles.css`.
- **Interactivité** : Modifiez `script.js`.

## Documentation détaillée

Pour plus d'informations, consultez [website/README.md](website/README.md).
