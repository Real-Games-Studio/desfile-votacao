# Assets (acervo)

Coloque aqui o acervo real. Os apps referenciam por caminho relativo (ver `shared/desfiles.json`):

```
assets/
  videos/   # mp4 H.264, sem audio, em loop (ex: mangueira-1985.mp4)
  thumbs/   # jpg quadrado pequeno para a lista e grid (ex: mangueira-1985.jpg)
  fotos/    # jpg paisagem para o podio do ranking (ex: mangueira-1985.jpg)
```

Enquanto o acervo nao chega, os apps degradam graciosamente: o player mostra um
bloco escuro com o nome da escola e as miniaturas viram blocos coloridos com as
iniciais. Nada quebra sem as midias.

Recomendacao de encoding dos videos: H.264, keyframe no primeiro frame (para loop
sem emenda), Full HD, sem faixa de audio.

## Crédito do placeholder
`assets/placeholder.mp4` = "Big Buck Bunny" (c) Blender Foundation, www.bigbuckbunny.org — licença Creative Commons Attribution 3.0. Usado apenas como vídeo placeholder até chegar o acervo real.
