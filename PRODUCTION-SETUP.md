# 🚀 Configuración de Producción - App SaaS

## 📋 Checklist de Deploy

### 1️⃣ Configuración de Dinahosting

✅ **Subdominio creado**: app.lujandev.com
- Apunta a IP: 64.226.123.91
- Tipo A Record

### 2️⃣ Configuración en Digital Ocean

#### SSH al servidor
```bash
ssh -i ~/.ssh/id_rsa_do root@64.226.123.91
```

#### Crear directorio del proyecto
```bash
mkdir -p /var/www/app_saas_mean
cd /var/www/app_saas_mean
```

#### Clonar repositorio de producción
```bash
git clone https://github.com/develoddy/app.saas.git .
```

#### Dar permisos correctos
```bash
chown -R www-data:www-data /var/www/app_saas_mean
chmod -R 755 /var/www/app_saas_mean
```

### 3️⃣ Configuración de Nginx

Crear archivo de configuración:
```bash
nano /etc/nginx/sites-available/app.lujandev.com
```

Contenido del archivo:
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name app.lujandev.com;

    root /var/www/app_saas_mean/app-saas;
    index index.html;

    # Logs
    access_log /var/log/nginx/app_saas_access.log;
    error_log /var/log/nginx/app_saas_error.log;

    # Configuración para Angular SPA
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache para assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/javascript application/xml+rss application/json;
}
```

Habilitar el sitio:
```bash
ln -s /etc/nginx/sites-available/app.lujandev.com /etc/nginx/sites-enabled/
```

Verificar configuración:
```bash
nginx -t
```

Recargar Nginx:
```bash
systemctl reload nginx
# o
service nginx reload
```

### 4️⃣ Configuración de SSL (Certbot)

```bash
apt-get install certbot python3-certbot-nginx -y
certbot --nginx -d app.lujandev.com
```

Seleccionar opción 2 para redirección automática HTTP → HTTPS

Verificar renovación automática:
```bash
certbot renew --dry-run
```

### 5️⃣ Configuración de Git Auto-Pull

Crear script de pull automático:
```bash
nano /var/www/app_saas_mean/pull.sh
```

Contenido:
```bash
#!/bin/bash
cd /var/www/app_saas_mean
git pull origin main
systemctl reload nginx
```

Dar permisos:
```bash
chmod +x /var/www/app_saas_mean/pull.sh
```

### 6️⃣ Firewall

Verificar que los puertos estén abiertos:
```bash
ufw status
ufw allow 80/tcp
ufw allow 443/tcp
```

## 🧪 Probar el Deploy

Desde tu Mac, ejecuta el script de deploy:
```bash
cd /Volumes/lujandev/dev/projects/ECOMMERCE/ECOMMERCE-MEAN/app-saas
./.devtools/deploy.sh
```

El script hará:
1. ✅ Commit en repo local (saas)
2. ✅ Compilar Angular
3. ✅ Limpiar archivos Mac (._* y .DS_Store)
4. ✅ Sync a carpeta de deploy
5. ✅ Push a GitHub (app.saas)
6. ✅ Pull automático en servidor
7. ✅ Reload Nginx

## 🌐 URLs Finales

- **Desarrollo**: http://localhost:4202
- **Producción**: https://app.lujandev.com

## 📝 Notas Importantes

1. El script de deploy maneja todo automáticamente
2. Nunca edites archivos en el servidor directamente
3. Siempre usa el script `.devtools/deploy.sh`
4. Los archivos `._*` y `.DS_Store` se eliminan automáticamente

## 🔍 Troubleshooting

### Error: "No se puede conectar al servidor"
```bash
# Verificar estado de Nginx
systemctl status nginx

# Ver logs
tail -f /var/log/nginx/app_saas_error.log
```

### Error: "404 Not Found"
```bash
# Verificar que los archivos estén en el lugar correcto
ls -la /var/www/app_saas_mean/app-saas/

# Verificar permisos
ls -ld /var/www/app_saas_mean/
```

### Error: "Git pull failed"
```bash
# SSH al servidor y pull manual
ssh -i ~/.ssh/id_rsa_do root@64.226.123.91
cd /var/www/app_saas_mean
git pull origin main
```
