#!/bin/bash
# Script de commandes rapides pour Calendraft
# Usage: ./quick-commands.sh [command]

# Utiliser le répertoire courant si docker-compose.yml est présent, sinon utiliser la variable d'environnement
if [ -f "docker-compose.yml" ]; then
    PROJECT_DIR="$(pwd)"
else
    PROJECT_DIR="${PROJECT_DIR:-$HOME/calendraft}"
fi

cd "$PROJECT_DIR" || exit 1

case "${1:-}" in
    status|ps)
        docker compose ps
        ;;
    logs)
        docker compose logs -f "${2:-}"
        ;;
    restart)
        docker compose restart "${2:-}"
        ;;
    stop)
        docker compose stop "${2:-}"
        ;;
    start)
        docker compose start "${2:-}"
        ;;
    shell-db)
        docker compose exec db psql -U calendraft -d calendraft
        ;;
    shell-server)
        docker compose exec server sh
        ;;
    shell-web)
        docker compose exec web sh
        ;;
    stats)
        docker stats
        ;;
    top)
        docker compose top
        ;;
    env)
        docker compose config
        ;;
    ""|*)
        echo "Commandes rapides pour Calendraft"
        echo ""
        echo "Usage: $0 [command] [service]"
        echo ""
        echo "Commandes disponibles:"
        echo "  status, ps          Afficher le statut des services"
        echo "  logs [service]      Afficher les logs (tous ou un service)"
        echo "  restart [service]   Redémarrer un service ou tous"
        echo "  stop [service]      Arrêter un service ou tous"
        echo "  start [service]     Démarrer un service ou tous"
        echo "  shell-db            Ouvrir un shell PostgreSQL"
        echo "  shell-server        Ouvrir un shell dans le conteneur server"
        echo "  shell-web           Ouvrir un shell dans le conteneur web"
        echo "  stats               Afficher les statistiques des conteneurs"
        echo "  top                 Afficher les processus des conteneurs"
        echo "  env                 Afficher la configuration Docker Compose"
        echo ""
        echo "Exemples:"
        echo "  $0 logs server      # Logs du backend"
        echo "  $0 restart web      # Redémarrer le frontend"
        echo "  $0 shell-db         # Accéder à PostgreSQL"
        ;;
esac

