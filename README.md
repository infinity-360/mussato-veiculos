# Site Mussato Veículos

Site completo da loja: vitrine com intro animada, busca por marca, estoque, simulador de financiamento,
venda/troca, dúvidas, contato e endereço — além do **painel do lojista** e da **área do cliente**.

## Como rodar

Precisa só do [Node.js](https://nodejs.org) 18 ou superior (não há dependências para instalar).

```powershell
node server.js
```

- Site: http://localhost:3000
- Área do cliente: http://localhost:3000/cliente
- Painel do lojista: http://localhost:3000/admin — senha inicial `mussato2026` (**troque no primeiro acesso**, em *Dados da loja*)

## Painel do lojista

- **Veículos:** cadastrar, editar, excluir, marcar destaque e mudar status (Disponível / Reservado / Vendido / Oculto).
- **Fotos:** arraste as fotos do carro. Com *Remover fundo (IA)* marcado, o fundo é removido automaticamente no
  navegador e o site coloca o carro sobre o fundo de estúdio da Mussato. *Tratar imagem* ajusta brilho, contraste e cor.
  A 1ª foto é a capa. Fotos internas: desmarque *Remover fundo*.
  (A remoção de fundo precisa de internet; a 1ª foto demora ~20s para baixar o modelo de IA.)
- **Mensagens:** interesse em veículos, dúvidas, propostas de venda/troca e contatos. Responda pelo painel
  (a resposta aparece na área do cliente) ou direto pelo WhatsApp.
- **Clientes:** lista de cadastrados, favoritos de cada um, exportação em CSV.
- **Dados da loja:** endereço, telefone, WhatsApp, Instagram, horário, mapa, taxa do simulador e perguntas frequentes.

O estoque inicial foi importado dos posts do Instagram @mussato_veiculos (fotos originais em `fotos-instagram/`,
uma pasta por veículo, com as versões sem fundo `*-sem-fundo.webp`). Os posts não informam preço, então esses
veículos aparecem como **"Consulte"** — preencha o preço no painel quando quiser exibir valor e simulação de parcelas.

## Dados e backup

Tudo fica em `data/` (`db.json` + fotos em `data/uploads`). Para backup, copie essa pasta.

O `data/db.json` **não vai para o Git** (tem o segredo de sessão, a senha do painel e os dados de clientes).
Na primeira execução sem ele, o servidor cria um novo a partir de `data/seed.json` (dados da loja + estoque)
com a senha inicial `mussato2026` — troque-a no primeiro acesso.

## Publicar na internet

Qualquer hospedagem que rode Node.js serve (VPS, Render, Railway etc.). Use HTTPS e mantenha a pasta `data/`
em disco persistente. A porta pode ser definida pela variável `PORT`.
