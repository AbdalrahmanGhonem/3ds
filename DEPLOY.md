# Deploy

This project can run as a single Node.js app that serves:

- frontend pages
- static assets
- `/api/*` backend endpoints

## 1. Server requirements

- Ubuntu VPS
- Node.js 20
- MySQL 8
- Nginx
- PM2

## 2. Upload project

Copy the whole project to the server, for example:

```bash
/var/www/3ds
```

## 3. Backend env

Inside `/var/www/3ds/backend/.env`:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=YOUR_DB_USER
DB_PASSWORD=YOUR_DB_PASSWORD
DB_NAME=three_ds_printing
PORT=4000
```

## 4. Install dependencies

```bash
cd /var/www/3ds/backend
npm install
```

## 5. Import database

```bash
mysql -u YOUR_DB_USER -p three_ds_printing < "/var/www/3ds/backend/migrations/3ds schema.sql"
```

If your schema is already imported, skip this step.

## 6. Start with PM2

```bash
cd /var/www/3ds/backend
npx pm2 start ecosystem.config.cjs
npx pm2 save
```

## 7. Nginx reverse proxy

Example `/etc/nginx/sites-available/3ds`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/3ds /etc/nginx/sites-enabled/3ds
sudo nginx -t
sudo systemctl reload nginx
```

## 8. SSL

After DNS points to the server:

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## Notes

- Open the site as `https://your-domain.com`, not by opening `html` files directly.
- Because frontend and API are served from the same app, no extra `API_BASE` configuration is needed in production.
- Product images are currently stored in the database as data URLs. That works, but moving them later to object storage or disk uploads would be better.
