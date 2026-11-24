// Gera dist/alibi-preview.html: demo jogável num único arquivo, sem servidor.
import { execSync } from 'child_process';
import fs from 'fs';
fs.mkdirSync('dist', { recursive: true });
execSync(`npx esbuild preview/main.tsx --bundle --minify --format=iife --jsx=automatic --target=es2020 --alias:next/link=./preview/next-link.tsx --alias:next/navigation=./preview/next-navigation.ts --alias:@=./src --define:process.env.NEXT_PUBLIC_SUPABASE_URL='""' --define:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='""' --define:process.env.NODE_ENV='"production"' --outfile=dist/preview.js`, { stdio: 'inherit' });
const css = fs.readFileSync('src/app/globals.css', 'utf8');
const js = fs.readFileSync('dist/preview.js', 'utf8').replaceAll('</script', '<\\/script');
fs.writeFileSync('dist/alibi-preview.html', `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ÁLIBI</title><style>${css}</style></head><body><div id="root"></div><script>${js}</script></body></html>`);
