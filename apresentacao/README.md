# Apresentação interativa do Valida SETIC

Slides do pitch do Valida SETIC (Hackathon SETIC / 3º Conexão Tech.RO, Desafio 1). Feitos pelo Judson Gabriel com
React, GSAP e Tailwind. Cada slide tem animação própria e notas do apresentador.

- **No ar:** https://valida-setic-apresentacao-interativ.vercel.app
- **O sistema de verdade:** https://valida-setic.onrender.com (a demo ao vivo é feita lá, não nos slides)

A pasta é independente da API: nada aqui roda no Render nem entra nos testes do `pytest`.

## Como rodar

Precisa do Node.js 20 ou mais novo. O projeto usa o **bun** (`bun install`, como na Vercel). Com npm, instale com
`--legacy-peer-deps`: o `package.json` pede o esbuild 0.25, e o Vite 8 prefere o 0.27 (o build funciona assim mesmo).

```bash
cd apresentacao
npm install --legacy-peer-deps   # ou: bun install
npm run dev      # abre em http://localhost:3000
npm run build    # gera a versão final em dist/
```

## Quem apresenta

| Parte | Slides | Quem |
|---|---|---|
| Pitch (3 min) | 1 a 7 (o 7 fecha com o diferencial, o impacto e "Agora, ao vivo") | Celso |
| Demonstração ao vivo | o sistema no Render | Felipe e Judson |
| Fechamento (~45 s) | 8 (futuro) e 9 (encerramento) | Felipe e Judson |

O regulamento corta aos 8 minutos no total, contando o fechamento. A demonstração precisa ser no sistema real
(item 8.5: animação no lugar da aplicação dá nota zero em Demonstração).

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
                       #   o 7 é o Slide07Diferencial; o Slide07Demo (animação) está fora da sequência
  components/          # navegação, notas do apresentador, fundo animado, links com QR code
  types.ts             # título e notas do apresentador de cada slide
  audio.ts             # efeitos sonoros
```
