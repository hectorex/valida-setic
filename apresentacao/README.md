# Apresentação interativa do Valida SETIC

Slides do pitch do Valida SETIC (Hackathon SETIC / 3º Conexão Tech.RO, Desafio 1). Feitos pelo Judson Gabriel com
React, GSAP e Tailwind. Cada slide tem animação própria e notas do apresentador.

- **No ar:** https://valida-setic-apresentacao-interativ.vercel.app
- **O sistema de verdade:** https://valida-setic.onrender.com (a demo ao vivo é feita lá, não nos slides)

A pasta é independente da API: nada aqui roda no Render nem entra nos testes do `pytest`.

## Como rodar

Precisa do Node.js 20 ou mais novo.

```bash
cd apresentacao
npm install
npm run dev      # abre em http://localhost:3000
npm run build    # gera a versão final em dist/
```

## Atalhos na apresentação

- Seta para a direita, espaço ou Page Down: próximo slide; seta para a esquerda ou Page Up: anterior
- `Home` / `End`: primeiro / último slide
- `N`: mostra ou esconde as notas do apresentador
- `F`: tela cheia
- `R`: reinicia a apresentação
- A barra de baixo também tem o som e o avanço automático

## Estrutura

```
src/
  App.tsx              # troca de slides e atalhos
  slides/              # um arquivo por slide (Slide01Cover ... Slide09Closing)
  components/          # navegação, notas do apresentador, fundo animado, links com QR code
  types.ts             # título e notas do apresentador de cada slide
  audio.ts             # efeitos sonoros
```
