#!/usr/bin/env python3
"""Gera toda a arte do Office (pixel art própria) e o mapa do escritório.

Saídas (já vêm prontas no repositório; rode de novo só se mudar algo aqui):
  src/assets/tiles.png        piso e paredes (tiles de 32 px)
  src/assets/moveis.png/.json atlas com móveis e colegas (formato JSON Hash do Phaser)
  src/assets/estagiario.png   o ESTAGIÁRIO: andando para baixo, para cima e de lado
  src/assets/equipamentos/    imagens grandes dos computadores (modal do levantamento, fase 2)
  src/assets/placas/          imagens grandes das placas Arduino e Raspberry Pi (fase 2, missão 3)
  src/assets/montar/          bancada de montagem, gabinetes e peças encaixadas (fase 3, missão 3)
  src/assets/projetor/        mesa da Sala de Reuniões com notebook, projetor, webcam e cabos (fase 4, missão 1)
  src/game/office-map.json    grade de tiles, móveis, salas e áreas de colisão

Uso (precisa de Python 3 + Pillow):  python3 packages/office/scripts/gerar-arte.py

Tudo é desenhado em "pixels de arte" e salvo ampliado 2x, então 1 pixel de arte = 2 px no jogo.
"""
import json
import math
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'src', 'assets')
GAME = os.path.join(ROOT, 'src', 'game')
SCALE = 2
T = 16  # tile em pixels de arte (32 px no jogo)


def hexc(h, a=255):
    h = h.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


OUT = hexc('1c1626')

# ---------------------------------------------------------------- utilitários de desenho


class Canvas:
    def __init__(self, w, h):
        self.im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        self.px = self.im.load()
        self.w, self.h = w, h

    def p(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[x, y] = hexc(c) if isinstance(c, str) else c

    def rect(self, x, y, w, h, c):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                self.p(xx, yy, c)

    def hline(self, x, y, w, c):
        self.rect(x, y, w, 1, c)

    def vline(self, x, y, h, c):
        self.rect(x, y, 1, h, c)

    def box(self, x, y, w, h, fill, edge=None, light=None):
        """Retângulo com contorno escuro e (opcional) borda clara em cima."""
        self.rect(x, y, w, h, fill)
        if light:
            self.hline(x + 1, y + 1, w - 2, light)
        if edge:
            self.hline(x, y + h - 1, w, edge)

    def outline(self, color=OUT):
        """Contorno externo de 1 px em volta de tudo que não é transparente."""
        src = self.im.copy().load()
        for y in range(self.h):
            for x in range(self.w):
                if src[x, y][3]:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < self.w and 0 <= ny < self.h and src[nx, ny][3] == 255:
                        self.px[x, y] = color
                        break
        return self

    @staticmethod
    def mirrored(src):
        c = Canvas(src.w, src.h)
        c.im = src.im.transpose(Image.FLIP_LEFT_RIGHT)
        c.px = c.im.load()
        return c

    def scaled(self):
        return self.im.resize((self.w * SCALE, self.h * SCALE), Image.NEAREST)


def noise(x, y, seed=0):
    """Ruído determinístico para dar textura (0..1)."""
    n = (x * 374761393 + y * 668265263 + seed * 2246822519) & 0xFFFFFFFF
    n = ((n ^ (n >> 13)) * 1274126177) & 0xFFFFFFFF
    return (n & 0xFFFF) / 0xFFFF


# ---------------------------------------------------------------- tiles

TILE_ORDER = ['void', 'wood', 'carpet', 'grey', 'beige', 'wall', 'face', 'door', 'glass', 'pave', 'facebase',
              'glassopen', 'sidewalk', 'mat', 'lane', 'ceramic', 'tileface', 'tilefacebase']
TILE_INDEX = {k: i for i, k in enumerate(TILE_ORDER)}


def tile_wood(c, ox):
    base, light, dark = '#b07443', '#c4874f', '#8a5630'
    for y in range(T):
        for x in range(T):
            plank = y // 4
            shift = (plank * 7) % 16
            col = base if noise(x + shift, plank, 1) > 0.25 else light
            if (x + shift) % 16 == 0:
                col = dark
            if y % 4 == 3:
                col = dark
            c.p(ox + x, y, col)


def tile_carpet(c, ox):
    for y in range(T):
        for x in range(T):
            n = noise(x, y, 2)
            col = '#2f6f78' if n > 0.3 else '#2a646c'
            if n > 0.93:
                col = '#3b818b'
            c.p(ox + x, y, col)


def tile_grey(c, ox):
    for y in range(T):
        for x in range(T):
            col = '#9aa1ab' if noise(x, y, 3) > 0.2 else '#929aa4'
            if x == 0 or y == 0:
                col = '#7e858f'
            c.p(ox + x, y, col)


def tile_beige(c, ox):
    for y in range(T):
        for x in range(T):
            col = '#e3d6bd' if noise(x, y, 4) > 0.2 else '#dbcdb2'
            if x % 8 == 0 or y % 8 == 0:
                col = '#c9b99b'
            c.p(ox + x, y, col)


def tile_wall(c, ox):
    # topo da parede (vista de cima): creme com borda escura
    c.rect(ox, 0, T, T, '#efe1c8')
    for x in range(T):
        c.p(ox + x, 0, '#c9b896')
        c.p(ox + x, T - 1, '#b8a47f')
    for y in range(T):
        if noise(ox, y, 5) > 0.95:
            c.p(ox + 7, y, '#e4d3b5')


def tile_face(c, ox):
    # face da parede (vista de frente): bege com textura
    for y in range(T):
        for x in range(T):
            col = '#d9c7a6' if noise(x, y, 6) > 0.15 else '#d1be9b'
            c.p(ox + x, y, col)
    c.hline(ox, 0, T, '#bfa985')


def tile_facebase(c, ox):
    # face da parede com rodapé (linha de baixo)
    tile_face(c, ox)
    c.rect(ox, 11, T, 4, '#8a5a34')
    c.hline(ox, 11, T, '#a8714a')
    c.hline(ox, 15, T, '#5d3b20')


def tile_door(c, ox):
    tile_wood(c, ox)
    c.rect(ox, 6, T, 4, '#6e4527')
    c.hline(ox, 6, T, '#8a5a34')


def tile_glass(c, ox):
    c.rect(ox, 0, T, T, '#7fb7c9')
    c.rect(ox, 0, T, 2, '#5c6b78')
    c.rect(ox, 14, T, 2, '#5c6b78')
    c.vline(ox, 0, T, '#5c6b78')
    for i in range(5):
        c.p(ox + 4 + i, 4 + i, '#c8eaf3')
        c.p(ox + 5 + i, 4 + i, '#c8eaf3')


def tile_pave(c, ox):
    for y in range(T):
        for x in range(T):
            col = '#3a3f4a' if noise(x, y, 7) > 0.2 else '#353a44'
            if y == 0:
                col = '#4a505c'
            c.p(ox + x, y, col)


def tile_glassopen(c, ox):
    # porta de vidro aberta: trilho de metal no chão e os vidros recolhidos nas laterais
    c.rect(ox, 0, T, T, '#aab2bd')
    for y in range(0, T, 3):
        c.hline(ox + 1, y, T - 2, '#9aa1ab')
    c.rect(ox, 0, T, 2, '#5c6b78')
    c.rect(ox, 14, T, 2, '#5c6b78')


def tile_sidewalk(c, ox):
    for y in range(T):
        for x in range(T):
            col = '#b9bcc2' if noise(x, y, 8) > 0.2 else '#b1b4ba'
            if x == 0 or y == 0:
                col = '#9a9ea6'
            c.p(ox + x, y, col)


def tile_mat(c, ox):
    tile_sidewalk(c, ox)
    c.rect(ox, 1, T, 13, '#2a646c')
    for y in range(3, 13, 2):
        c.hline(ox + 1, y, T - 2, '#2f7f8a')


def tile_lane(c, ox):
    tile_pave(c, ox)
    c.rect(ox + 2, 7, 10, 2, '#e0b84a')


def tile_ceramic(c, ox):
    # piso do banheiro: lajotas brancas de 8 px com rejunte
    for y in range(T):
        for x in range(T):
            col = '#e9eef2' if noise(x, y, 9) > 0.15 else '#e1e7ec'
            if x % 8 == 0 or y % 8 == 0:
                col = '#b9c4cd'
            c.p(ox + x, y, col)


def tile_tileface(c, ox):
    # parede do banheiro (de frente): azulejos azul-claro
    for y in range(T):
        for x in range(T):
            col = '#bfe0ea' if noise(x, y, 10) > 0.15 else '#b5d8e3'
            if x % 8 == 0 or y % 8 == 0:
                col = '#93bccb'
            c.p(ox + x, y, col)
    c.hline(ox, 0, T, '#7fa9b8')


def tile_tilefacebase(c, ox):
    # azulejo com rodapé de cerâmica escura
    tile_tileface(c, ox)
    c.rect(ox, 12, T, 4, '#5f7f8c')
    c.hline(ox, 12, T, '#7d9eab')
    c.hline(ox, 15, T, '#3f5a66')


def tile_void(c, ox):
    c.rect(ox, 0, T, T, '#232833')


def make_tiles():
    c = Canvas(T * len(TILE_ORDER), T)
    fns = {
        'void': tile_void, 'wood': tile_wood, 'carpet': tile_carpet, 'grey': tile_grey, 'beige': tile_beige,
        'wall': tile_wall, 'face': tile_face, 'facebase': tile_facebase, 'door': tile_door, 'glass': tile_glass,
        'pave': tile_pave, 'glassopen': tile_glassopen, 'sidewalk': tile_sidewalk, 'mat': tile_mat, 'lane': tile_lane,
        'ceramic': tile_ceramic, 'tileface': tile_tileface, 'tilefacebase': tile_tilefacebase,
    }
    for i, k in enumerate(TILE_ORDER):
        fns[k](c, i * T)
    c.scaled().save(os.path.join(ASSETS, 'tiles.png'))


# ---------------------------------------------------------------- mapa (48 x 32 tiles)
#  #  topo de parede       F  face da parede (o rodapé é desenhado na última linha de face)
#  .  piso de madeira      c  carpete     g  piso cinza     b  piso bege (copa)
#  D  porta (vão)          G  porta de vidro   s  calçada   m  capacho   p/l  rua   ' ' fora do prédio
#  w  piso do banheiro     Z  face da parede do banheiro (azulejos)

W, H = 48, 35


def build_grid():
    g = [['#'] * W for _ in range(H)]

    def fill(x, y, w, h, ch):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                g[yy][xx] = ch

    # salas de cima: diretoria, reuniões, RH, financeiro
    for x, w, floor in ((1, 13, '.'), (15, 16, 'c'), (32, 7, 'c'), (40, 7, 'c')):
        fill(x, 1, w, 2, 'F')
        fill(x, 3, w, 6, floor)
    for x in (11, 16, 33, 41):  # portas na parede de baixo
        fill(x, 9, 2, 1, 'D')
    fill(1, 10, 46, 1, '.')  # corredor de cima

    # área aberta (trabalho + recepção)
    fill(12, 11, 23, 18, '.')
    fill(19, 23, 10, 1, '#')  # meia-parede atrás da recepção
    fill(1, 20, 46, 1, '.')  # corredor do meio

    # impressão (porta à direita) e copa (porta à esquerda)
    fill(1, 12, 10, 2, 'F')
    fill(1, 14, 10, 5, 'g')
    fill(11, 15, 1, 2, 'D')
    fill(36, 12, 11, 2, 'F')
    fill(36, 14, 11, 5, 'b')
    fill(35, 15, 1, 2, 'D')

    # TI (porta em cima)
    fill(1, 22, 10, 2, 'F')
    fill(1, 24, 10, 5, 'g')
    fill(6, 21, 2, 1, 'D')
    fill(6, 22, 2, 2, 'g')
    # arquivo (porta à esquerda, pela recepção) e banheiro (porta em cima, no corredor do meio)
    fill(36, 22, 5, 2, 'F')
    fill(36, 24, 5, 5, 'g')
    fill(35, 25, 1, 2, 'D')
    fill(42, 22, 5, 2, 'Z')
    fill(42, 24, 5, 5, 'w')
    fill(42, 21, 2, 1, 'D')
    fill(42, 22, 2, 2, 'w')

    # entrada e calçada
    fill(21, 29, 5, 1, 'G')
    fill(0, 30, W, 3, 's')
    fill(22, 30, 3, 1, 'm')
    fill(0, 33, W, 1, 'p')
    fill(0, 34, W, 1, 'l')
    return [''.join(r) for r in g]


def tile_of(grid, x, y):
    ch = grid[y][x]
    if ch in 'FZ':
        below = grid[y + 1][x] if y + 1 < H else '#'
        if ch == 'Z':
            return 'tileface' if below == 'Z' else 'tilefacebase'
        return 'face' if below == 'F' else 'facebase'
    return {'#': 'wall', '.': 'wood', 'c': 'carpet', 'g': 'grey', 'b': 'beige', 'D': 'door', 'G': 'glass',
            'p': 'pave', ' ': 'void', 's': 'sidewalk', 'm': 'mat', 'l': 'lane', 'w': 'ceramic'}[ch]


SOLID_TILES = ['wall', 'face', 'facebase', 'glass', 'pave', 'void', 'lane', 'tileface', 'tilefacebase']

# ---------------------------------------------------------------- personagens

SKIN, SKIN_D = '#f2c29b', '#d89a72'
PANTS, PANTS_D = '#2d3652', '#1f263c'
SHOES = '#4a2f1c'

ESTAGIARIO = {'hair': ('#8a5427', '#a8692f', '#5e3716'), 'shirt': ('#5f9e2f', '#7dbb45', '#447a1f')}

NPC_LOOKS = [
    {'hair': ('#2b2226', '#43363b', '#18121a'), 'shirt': ('#e9edf2', '#ffffff', '#c3cad4')},
    {'hair': ('#c5763a', '#df9452', '#94531f'), 'shirt': ('#d6a12a', '#ecbd48', '#a87a14')},
    {'hair': ('#2b2226', '#43363b', '#18121a'), 'shirt': ('#5b6070', '#737a8c', '#424655')},
    {'hair': ('#d9b25e', '#ecca7c', '#a8823a'), 'shirt': ('#2f5f9e', '#457bc0', '#21467a')},
    {'hair': ('#6b3d22', '#8a5530', '#47271a'), 'shirt': ('#b03a3a', '#cc5252', '#822828'), 'long': True},  # Elisa
    {'hair': ('#3a2a20', '#55402f', '#22180f'), 'shirt': ('#2e3d6b', '#41558f', '#1f2a4d')},  # diretor
    {'hair': ('#5a2e1e', '#7a4430', '#3a1c12'), 'shirt': ('#7b4bb3', '#9466cc', '#5a3488'), 'long': True},  # RH
]
# Visuais na folha colegas.png (0-4 = colegas da Área de Trabalho, 5 = responsável do RH, 6 = CEO).
SHEET_LOOKS = NPC_LOOKS[:5] + [NPC_LOOKS[6], NPC_LOOKS[5]]


def draw_head(c, ox, oy, look, facing, mood='normal'):
    """Cabeça 10x11 a partir de (ox, oy). facing: down | up | right. mood (só de frente): normal | bravo | feliz."""
    draw_head_base(c, ox, oy, look, facing, mood)
    if not look.get('long'):
        return
    # cabelo comprido até os ombros (desenhado por cima do tronco)
    hair, hair_l, hair_d = look['hair']
    if facing == 'down':
        c.rect(ox - 1, oy + 4, 2, 10, hair)
        c.rect(ox + 9, oy + 4, 2, 10, hair)
        c.vline(ox - 1, oy + 6, 7, hair_d)
        c.vline(ox + 10, oy + 6, 7, hair_d)
    elif facing == 'up':
        c.rect(ox - 1, oy + 8, 12, 6, hair)
        c.rect(ox, oy + 12, 10, 2, hair_d)
        c.rect(ox + 3, oy + 9, 3, 2, hair_l)
    else:
        c.rect(ox - 1, oy + 4, 5, 10, hair)
        c.vline(ox - 1, oy + 6, 7, hair_d)


def draw_head_base(c, ox, oy, look, facing, mood='normal'):
    hair, hair_l, hair_d = look['hair']
    if facing == 'up':
        c.rect(ox - 1, oy + 1, 12, 8, hair)
        c.rect(ox, oy + 9, 10, 1, hair)
        c.rect(ox, oy - 1, 10, 2, hair)
        c.rect(ox + 2, oy - 2, 3, 1, hair)
        c.rect(ox + 2, oy + 1, 5, 2, hair_l)
        c.rect(ox, oy + 8, 10, 2, hair_d)
        c.rect(ox + 3, oy + 10, 4, 1, SKIN_D)
        return
    if facing == 'down':
        c.rect(ox, oy + 2, 10, 8, SKIN)
        c.rect(ox, oy + 9, 10, 1, SKIN_D)
        c.rect(ox - 1, oy, 12, 4, hair)  # volume do cabelo
        c.rect(ox, oy - 1, 10, 1, hair)
        c.rect(ox + 2, oy - 2, 3, 1, hair)
        c.rect(ox + 6, oy - 2, 2, 1, hair)
        c.rect(ox - 1, oy + 4, 2, 3, hair)  # costeletas
        c.rect(ox + 9, oy + 4, 2, 3, hair)
        c.rect(ox + 1, oy + 4, 3, 1, hair)  # franja repicada
        c.p(ox + 5, oy + 4, hair)
        c.rect(ox + 7, oy + 4, 2, 1, hair)
        c.rect(ox + 1, oy - 1, 4, 1, hair_l)
        c.rect(ox + 2, oy, 2, 1, hair_l)
        c.rect(ox + 6, oy + 2, 3, 1, hair_d)
        c.rect(ox + 3, oy + 10, 4, 1, SKIN_D)  # pescoço
        if mood == 'bravo':
            for y in range(oy + 5, oy + 9):  # rosto vermelho de raiva
                for x in range(ox + 1, ox + 9):
                    if c.px[x, y] == hexc(SKIN):
                        c.p(x, y, '#f2a48a')
            c.rect(ox + 3, oy + 6, 1, 2, OUT)  # olhos
            c.rect(ox + 6, oy + 6, 1, 2, OUT)
            c.p(ox + 2, oy + 5, OUT)  # sobrancelhas inclinadas
            c.p(ox + 7, oy + 5, OUT)
            for x, y in ((3, 9), (4, 8), (5, 9), (6, 8)):  # boca em zigue-zague
                c.p(ox + x, oy + y, OUT)
            return
        if mood == 'feliz':
            c.p(ox + 2, oy + 7, OUT)  # olhos fechados de alegria (^ ^)
            c.p(ox + 3, oy + 6, OUT)
            c.p(ox + 4, oy + 7, OUT)
            c.p(ox + 5, oy + 7, OUT)
            c.p(ox + 6, oy + 6, OUT)
            c.p(ox + 7, oy + 7, OUT)
            c.rect(ox + 3, oy + 8, 4, 2, OUT)  # boca aberta
            c.rect(ox + 4, oy + 9, 2, 1, '#d9534f')
            c.p(ox + 1, oy + 8, '#f0a58a')
            c.p(ox + 8, oy + 8, '#f0a58a')
            return
        c.rect(ox + 3, oy + 6, 1, 2, OUT)  # olhos
        c.rect(ox + 6, oy + 6, 1, 2, OUT)
        c.rect(ox + 4, oy + 8, 2, 1, SKIN_D)  # boca
        return
    # lado (olhando para a direita)
    c.rect(ox + 1, oy + 2, 9, 8, SKIN)
    c.rect(ox + 1, oy + 9, 8, 1, SKIN_D)
    c.rect(ox - 1, oy, 11, 4, hair)
    c.rect(ox, oy - 1, 9, 1, hair)
    c.rect(ox + 2, oy - 2, 4, 1, hair)
    c.rect(ox, oy + 4, 4, 5, hair)  # nuca
    c.rect(ox + 5, oy + 4, 4, 1, hair)  # franja
    c.rect(ox + 2, oy, 4, 1, hair_l)
    c.rect(ox, oy + 7, 3, 2, hair_d)
    c.p(ox + 4, oy + 6, SKIN_D)  # orelha
    c.rect(ox + 7, oy + 6, 1, 2, OUT)  # olho
    c.p(ox + 9, oy + 8, SKIN_D)
    c.rect(ox + 3, oy + 10, 4, 1, SKIN_D)


def draw_body_front(c, ox, oy, look, arm_l=0, arm_r=0, back=False):
    """Tronco 10 x 8 com braços. arm_*: deslocamento vertical do braço (balanço)."""
    shirt, shirt_l, shirt_d = look['shirt']
    c.rect(ox, oy, 10, 8, shirt)
    c.rect(ox + 1, oy, 8, 1, shirt_l)
    if not back:
        c.p(ox + 3, oy, shirt_d)  # gola
        c.p(ox + 6, oy, shirt_d)
        c.rect(ox + 4, oy, 2, 2, SKIN)
        c.vline(ox + 5, oy + 2, 5, shirt_d)  # botões
    else:
        c.hline(ox + 2, oy + 1, 6, shirt_d)
    c.hline(ox, oy + 7, 10, PANTS_D)  # cinto
    for side, dy in ((-2, arm_l), (10, arm_r)):
        c.rect(ox + side, oy + 1 + dy, 2, 6, shirt_d if side < 0 else shirt)
        c.vline(ox + side + (1 if side < 0 else 0), oy + 1 + dy, 6, shirt_d)
        c.rect(ox + side, oy + 7 + dy, 2, 2, SKIN)


def draw_legs_front(c, ox, oy, lift_l=0, lift_r=0):
    """Pernas 10 x 7 a partir de (ox, oy). lift_*: perna levantada."""
    for lx, lift in ((1, lift_l), (5, lift_r)):
        h = 5 - lift
        c.rect(ox + lx, oy, 4, h, PANTS)
        c.vline(ox + lx + 3, oy, h, PANTS_D)
        c.rect(ox + lx, oy + h, 4, 2, SHOES)
    c.vline(ox + 5, oy + 1, 4, PANTS_D)


FH = 32  # altura do quadro do personagem (pés na linha 29)
FRONT_LIFT = [(2, 0), (1, 0), (0, 0), (0, 2), (0, 1), (0, 0)]  # (perna esquerda, perna direita)
FRONT_ARMS = [(1, -1), (1, -1), (0, 0), (-1, 1), (-1, 1), (0, 0)]


# Fase 3, missão 5: calça molhada (não deu tempo de chegar ao banheiro). A mancha só pinta o que é calça:
# bem escura, com um brilho azul de molhado em cima, para aparecer mesmo com a calça azul-marinho.
WET, WET_D, WET_SHINE = '#080b14', '#05070d', '#7fa6e6'


def wet_stain(c, x0, x1, y0, y1, drip=(), shine=()):
    """Escurece a calça entre (x0..x1, y0..y1), mais as gotas `drip` [(x, y)] escorrendo pela perna e o brilho `shine`."""
    pants = {hexc(PANTS): hexc(WET), hexc(PANTS_D): hexc(WET_D)}
    cells = [(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)] + list(drip)
    for x, y in cells:
        if 0 <= x < c.w and 0 <= y < c.h and c.px[x, y] in pants:
            c.px[x, y] = pants[c.px[x, y]]
    for x, y in shine:
        if 0 <= x < c.w and 0 <= y < c.h and c.px[x, y] in (hexc(WET), hexc(WET_D)):
            c.px[x, y] = hexc(WET_SHINE)
    return c


def wet_front(c, oy):
    """Mancha de frente (ou de costas): do cavalo até o meio das coxas, escorrendo pela parte de dentro das pernas."""
    return wet_stain(c, 6, 11, oy, oy + 2, ((7, oy + 3), (8, oy + 3), (9, oy + 3), (10, oy + 3), (8, oy + 4), (9, oy + 4)),
                     ((7, oy), (8, oy + 1)))


def char_front(look, frame, back=False, wet=False):
    """Quadro 18 x 30 de frente (ou de costas). 6 quadros: passo E, apoio, neutro, passo D, apoio, neutro."""
    c = Canvas(18, FH)
    lift_l, lift_r = FRONT_LIFT[frame]
    arm_l, arm_r = FRONT_ARMS[frame]
    if back:
        arm_l, arm_r = arm_r, arm_l
    oy = 4
    draw_legs_front(c, 4, oy + 19, lift_l, lift_r)
    draw_body_front(c, 4, oy + 11, look, arm_l, arm_r, back=back)
    draw_head(c, 4, oy, look, 'up' if back else 'down')
    if wet:
        wet_front(c, oy + 19)
    return c.outline()


# Ciclo de caminhada de lado em 6 quadros (contato, apoio, passagem — e espelhado).
SIDE_LEGS = [(4, -3), (2, -2), (0, 0), (-3, 4), (-2, 2), (0, 0)]  # (pé da frente, pé de trás) em x
SIDE_LIFT = [0, 0, 2, 0, 0, 2]  # qual pé sobe na passagem: o de trás


def char_side(look, frame, wet=False):
    c = Canvas(18, FH)
    front, rear = SIDE_LEGS[frame]
    lift = SIDE_LIFT[frame]
    oy = 3
    hip_x, hip_y = 8, oy + 19
    shirt, shirt_l, shirt_d = look['shirt']

    def leg(off, color, raise_):
        for i in range(6):
            x = hip_x + round(off * i / 5)
            y = hip_y + i - (raise_ if i >= 3 else 0)
            c.rect(x, y, 3, 1, color)
        fx = hip_x + off
        fy = hip_y + 6 - raise_
        c.rect(fx, fy, 4, 2, SHOES)

    # perna de trás (mais escura), braço de trás, corpo, perna da frente, braço da frente
    leg(rear, PANTS_D, lift if frame in (2,) else 0)
    c.rect(hip_x - round(front / 2), oy + 12, 2, 6, shirt_d)
    c.rect(5, oy + 11, 8, 8, shirt)
    c.hline(6, oy + 11, 6, shirt_l)
    c.hline(5, oy + 18, 8, PANTS_D)
    c.rect(11, oy + 11, 2, 2, shirt_d)
    leg(front, PANTS, lift if frame in (5,) else 0)
    ax = hip_x + round(rear / 2)
    c.rect(ax, oy + 12, 2, 5, shirt_d)
    c.rect(ax, oy + 17, 2, 2, SKIN)
    draw_head(c, 4, oy, look, 'right')
    if wet:
        wet_stain(c, 6, 12, hip_y - 1, hip_y + 2, ((9, hip_y + 3), (10, hip_y + 3), (10, hip_y + 4), (11, hip_y + 3)),
                  ((10, hip_y), (11, hip_y + 1)))
    return c.outline()


def make_estagiario():
    """Folha 6 x 4: linhas = baixo, esquerda, direita, cima (mesmo formato das folhas de RPG).
    Também gera estagiario-molhado.png: a mesma folha com a calça molhada (fase 3, missão 5)."""
    cols = 6
    for name, wet in (('estagiario.png', False), ('estagiario-molhado.png', True)):
        sheet = Image.new('RGBA', (18 * cols * SCALE, FH * 4 * SCALE), (0, 0, 0, 0))
        right = [char_side(ESTAGIARIO, f, wet) for f in range(6)]
        rows = [
            [char_front(ESTAGIARIO, f, wet=wet) for f in range(6)],
            [Canvas.mirrored(fr) for fr in right],
            right,
            [char_front(ESTAGIARIO, f, back=True, wet=wet) for f in range(6)],
        ]
        for r, frames in enumerate(rows):
            for i, fr in enumerate(frames):
                sheet.paste(fr.scaled(), (i * 18 * SCALE, r * FH * SCALE))
        sheet.save(os.path.join(ASSETS, name))


def make_colegas():
    """Colegas andando (missão 2): uma folha 6 x 4 por visual, empilhadas (visual 0 nas linhas 0-3, etc.)."""
    looks = SHEET_LOOKS
    sheet = Image.new('RGBA', (18 * 6 * SCALE, FH * 4 * len(looks) * SCALE), (0, 0, 0, 0))
    for li, look in enumerate(looks):
        right = [char_side(look, f) for f in range(6)]
        rows = [
            [char_front(look, f) for f in range(6)],
            [Canvas.mirrored(fr) for fr in right],
            right,
            [char_front(look, f, back=True) for f in range(6)],
        ]
        for r, frames in enumerate(rows):
            for i, fr in enumerate(frames):
                sheet.paste(fr.scaled(), (i * 18 * SCALE, (li * 4 + r) * FH * SCALE))
    sheet.save(os.path.join(ASSETS, 'colegas.png'), optimize=True)


def make_cursor():
    """Cursor em forma de dedo indicador (pixel art), 16 x 18, ponta do dedo em (5, 0)."""
    rows = [
        '.....##.........',
        '....#oo#........',
        '....#oo#........',
        '....#oo#........',
        '....#oo###......',
        '....#oo#oo###...',
        '.##.#oo#oo#oo##.',
        '#oo##oo#oo#oo#o#',
        '#ooo#ooooooooo#o#'[:16],
        '.#oooooooooooo##',
        '..#oooooooooooo#',
        '..#ooooooooooo#.',
        '...#oooooooooo#.',
        '....#ooooooooo#.',
        '.....#oooooooo#.',
        '.....#oooooooo#.',
        '.....##########.',
    ]
    c = Canvas(16, len(rows))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch == '#':
                c.p(x, y, OUT)
            elif ch == 'o':
                c.p(x, y, '#ffffff')
    c.scaled().save(os.path.join(ASSETS, 'cursor-dedo.png'))


def empty_chair():
    c = Canvas(20, 24)
    c.rect(2, 7, 16, 14, '#2b6f7a')
    c.rect(3, 8, 14, 1, '#3b8995')
    c.rect(2, 20, 16, 1, '#1f525a')
    c.rect(4, 10, 12, 8, '#327f8b')
    return c.outline()


def f_sign():
    """Placa LIBERADO: plaquinha verde com ✓ em cima da mesa."""
    c = Canvas(16, 14)
    c.rect(1, 1, 14, 9, '#ffffff')
    c.rect(2, 2, 12, 7, '#2f9e5a')
    for x, y in ((5, 5), (6, 6), (7, 5), (8, 4), (9, 3), (10, 2)):
        c.p(x, y, '#ffffff')
    c.p(6, 5, '#ffffff')
    c.rect(3, 10, 2, 3, WOOD_D)
    c.rect(11, 10, 2, 3, WOOD_D)
    return c.outline()


def f_screen_glow():
    """Brilho do monitor ligado (por cima das costas do monitor na mesa)."""
    c = Canvas(18, 4)
    c.rect(1, 1, 16, 2, '#9fe0ff')
    c.rect(3, 0, 12, 1, '#d8f4ff')
    return c


def f_angry():
    """Símbolo de raiva em cima da cabeça."""
    c = Canvas(12, 12)
    for x, y in ((2, 2), (3, 3), (4, 4), (9, 2), (8, 3), (7, 4), (2, 9), (3, 8), (4, 7), (9, 9), (8, 8), (7, 7)):
        c.rect(x, y, 1, 1, '#f54129')
    c.rect(2, 2, 2, 1, '#f54129')
    c.rect(8, 2, 2, 1, '#f54129')
    c.rect(2, 9, 2, 1, '#f54129')
    c.rect(8, 9, 2, 1, '#f54129')
    return c.outline(hexc('ffffff'))


def npc_seated(look):
    """Colega sentado (de frente) com o encosto da cadeira atrás: 20 x 24."""
    c = Canvas(20, 24)
    c.rect(2, 7, 16, 14, '#2b6f7a')  # encosto
    c.rect(3, 8, 14, 1, '#3b8995')
    c.rect(2, 20, 16, 1, '#1f525a')
    draw_body_front(c, 5, 16, look, 0, 0)
    draw_head(c, 5, 5, look, 'down')
    return c.outline()


def intern_seated():
    """ESTAGIÁRIO sentado de frente numa cadeira da Sala de Reuniões (encosto verde-água atrás): 20 x 24."""
    c = Canvas(20, 24)
    c.rect(2, 7, 16, 14, TEAL)
    c.rect(3, 8, 14, 1, TEAL_L)
    c.rect(2, 20, 16, 1, TEAL_D)
    draw_body_front(c, 5, 16, ESTAGIARIO, -1, 1)
    draw_head(c, 5, 5, ESTAGIARIO, 'down')
    return c.outline()


def npc_seated_typing(look):
    c = Canvas(20, 24)
    c.rect(2, 7, 16, 14, '#2b6f7a')
    c.rect(3, 8, 14, 1, '#3b8995')
    c.rect(2, 20, 16, 1, '#1f525a')
    draw_body_front(c, 5, 16, look, -1, 1)
    draw_head(c, 5, 6, look, 'down')
    return c.outline()


def arms_up(c, ox, oy, look, height):
    """Braços levantados: sobem `height` px a partir dos ombros (tronco em ox, oy)."""
    shirt, _, shirt_d = look['shirt']
    shirt_l = look['shirt'][1]
    for side in (-3, 11):
        c.rect(ox + side, oy + 1 - height, 2, height + 2, shirt_l)
        c.rect(ox + side, oy - 1 - height, 2, 2, SKIN)


def ceo(look, pose):
    """CEO sentado (20 x 26): bravo-a/bravo-b (frustrado), feliz-a/feliz-b (comemorando)."""
    c = Canvas(20, 26)
    shirt, shirt_l, shirt_d = look['shirt']
    oy = 2
    c.rect(2, 9, 16, 14, '#2b6f7a')
    c.rect(3, 10, 14, 1, '#3b8995')
    c.rect(2, 22, 16, 1, '#1f525a')
    mood = 'bravo' if pose.startswith('bravo') else 'feliz'
    if pose == 'bravo-a':
        draw_body_front(c, 5, oy + 16, look, 0, 0)
        draw_head(c, 5, oy + 5, look, 'down', mood)
    elif pose == 'bravo-b':  # mãos na cabeça
        c.rect(5, oy + 16, 10, 8, shirt)
        c.rect(6, oy + 16, 8, 1, shirt_l)
        c.hline(5, oy + 23, 10, PANTS_D)
        c.rect(3, oy + 9, 2, 8, shirt_d)
        c.rect(15, oy + 9, 2, 8, shirt_d)
        draw_head(c, 5, oy + 5, look, 'down', mood)
        c.rect(3, oy + 7, 2, 3, SKIN)
        c.rect(15, oy + 7, 2, 3, SKIN)
    else:
        h = 13 if pose == 'feliz-a' else 10
        draw_body_front(c, 5, oy + 16, look, 0, 0)
        c.rect(3, oy + 17, 2, 8, '#2b6f7a')  # apaga os braços de baixo (fica o encosto)
        c.rect(15, oy + 17, 2, 8, '#2b6f7a')
        arms_up(c, 5, oy + 16, look, h)
        draw_head(c, 5, oy + 5, look, 'down', mood)
    return c.outline()


def f_smoke():
    c = Canvas(14, 10)
    c.rect(3, 2, 8, 6, '#e6e9ee')
    c.rect(1, 4, 12, 4, '#e6e9ee')
    c.rect(5, 1, 4, 1, '#e6e9ee')
    c.rect(4, 3, 3, 2, '#ffffff')
    c.hline(2, 7, 10, '#b4bcc8')
    return c.outline(hexc('6f7782'))


def f_alert():
    c = Canvas(12, 16)
    c.rect(1, 1, 10, 11, '#ffffff')
    c.rect(4, 12, 3, 2, '#ffffff')
    c.p(4, 14, '#ffffff')
    c.rect(5, 3, 2, 5, '#f54129')
    c.rect(5, 9, 2, 2, '#f54129')
    return c.outline()


def f_confetti():
    c = Canvas(3, 3)
    c.rect(0, 0, 3, 3, '#ffffff')
    return c


def f_tablet_hand():
    """Tablet na mão de um colega (por cima do tronco, de frente): 12 x 8."""
    c = Canvas(12, 8)
    c.rect(0, 0, 12, 8, '#2b2f37')
    c.rect(1, 1, 10, 6, '#9fd3ff')
    c.hline(2, 2, 6, '#ffffff')
    c.hline(2, 4, 7, '#5b8fd0')
    c.hline(2, 5, 4, '#5b8fd0')
    c.rect(0, 2, 1, 4, SKIN)  # dedões segurando
    c.rect(11, 2, 1, 4, SKIN)
    return c.outline()


def f_heart():
    c = Canvas(7, 6)
    for y, row in enumerate(('.##.##.', '#######', '#######', '.#####.', '..###..', '...#...')):
        for x, ch in enumerate(row):
            if ch == '#':
                c.p(x, y, '#f0506e')
    c.p(1, 1, '#ffb3c1')
    return c.outline()


def f_chat():
    """Balão de conversa com reticências."""
    c = Canvas(14, 11)
    c.rect(1, 1, 12, 7, '#ffffff')
    c.rect(3, 8, 2, 1, '#ffffff')
    c.p(3, 9, '#ffffff')
    for x in (4, 7, 10):
        c.p(x, 4, OUT)
    return c.outline()


def hug(frame):
    """ESTAGIÁRIO e colega abraçados de lado, comemorando (36 x 34; pés na linha 31). b = pulando."""
    c = Canvas(36, 34)
    oy = 6 if frame == 'a' else 3
    up = frame == 'b'

    def person(ox, look, outer):
        shirt, shirt_l, shirt_d = look['shirt']
        draw_legs_front(c, ox, oy + 19)
        c.rect(ox, oy + 11, 10, 8, shirt)
        c.rect(ox + 1, oy + 11, 8, 1, shirt_l)
        c.p(ox + 3, oy + 11, shirt_d)
        c.p(ox + 6, oy + 11, shirt_d)
        c.rect(ox + 4, oy + 11, 2, 2, SKIN)
        c.vline(ox + 5, oy + 13, 5, shirt_d)
        c.hline(ox, oy + 18, 10, PANTS_D)
        side = -2 if outer == 'left' else 10
        if not up:
            c.rect(ox + side, oy + 12, 2, 6, shirt_d)
            c.rect(ox + side, oy + 18, 2, 2, SKIN)
        draw_head(c, ox, oy, look, 'down')
        # sorriso aberto e bochechas coradas
        c.rect(ox + 4, oy + 8, 2, 1, SKIN)
        c.p(ox + 3, oy + 8, OUT)
        c.rect(ox + 4, oy + 9, 2, 1, OUT)
        c.p(ox + 6, oy + 8, OUT)
        c.p(ox + 1, oy + 8, '#f0a58a')
        c.p(ox + 8, oy + 8, '#f0a58a')
        if up:  # braço de fora para cima, comemorando (por fora do cabelo)
            out = -1 if outer == 'left' else 1
            sx = ox + (-3 if outer == 'left' else 11)
            c.rect(sx, oy + 6, 2, 7, shirt_l)
            c.rect(sx + out, oy + 2, 2, 5, shirt_l)
            c.rect(sx + out, oy, 2, 2, SKIN)

    colega = NPC_LOOKS[4]
    person(20, colega, 'right')  # atrás
    c.rect(5, oy + 15, 2, 2, SKIN)  # mão da colega na cintura do ESTAGIÁRIO (braço por trás)
    person(7, ESTAGIARIO, 'left')
    # braço do ESTAGIÁRIO por cima do ombro da colega
    c.rect(17, oy + 11, 5, 2, ESTAGIARIO['shirt'][1])
    c.hline(17, oy + 12, 5, ESTAGIARIO['shirt'][2])
    c.rect(22, oy + 11, 2, 2, SKIN)
    return c.outline()


def f_screen_light():
    """Luz da tela ligada no escuro (missão 6): mancha azulada suave, desenhada com mistura aditiva."""
    w, h = 40, 26
    c = Canvas(w, h)
    for y in range(h):
        for x in range(w):
            d = ((x - w / 2 + 0.5) / (w / 2)) ** 2 + ((y - h / 2 + 0.5) / (h / 2)) ** 2
            if d < 1:
                a = int(150 * (1 - d) ** 1.6)
                c.p(x, y, (120, 190, 255, a))
    return c


def f_led():
    """Luzinha laranja do computador suspenso."""
    c = Canvas(3, 3)
    c.rect(0, 0, 3, 3, '#ffae00')
    c.p(1, 1, '#fff2c4')
    return c


def f_alarm_panel():
    """Painel do alarme num pedestal, ao lado da porta principal."""
    c = Canvas(14, 26)
    c.rect(6, 12, 2, 12, METAL_D)  # pedestal
    c.rect(3, 23, 8, 2, METAL)
    c.rect(1, 1, 12, 12, '#e9e6dc')
    c.hline(1, 1, 12, '#ffffff')
    c.rect(3, 3, 8, 3, '#1f3a2a')  # visor
    c.hline(4, 4, 4, '#7ee08a')
    for row in range(2):
        for col in range(3):
            c.p(3 + col * 3, 8 + row * 2, '#596678')
    c.p(11, 3, '#f54129')  # luz do alarme
    return c.outline()


def cheer(frame, wet=False):
    """ESTAGIÁRIO comemorando de frente, os dois braços para cima (b = pulando): 18 x 34, pés na linha 31."""
    c = Canvas(18, 34)
    look = ESTAGIARIO
    oy = 6 if frame == 'a' else 3
    shirt, shirt_l, shirt_d = look['shirt']
    draw_legs_front(c, 4, oy + 19)
    c.rect(4, oy + 11, 10, 8, shirt)
    c.rect(5, oy + 11, 8, 1, shirt_l)
    c.p(7, oy + 11, shirt_d)
    c.p(10, oy + 11, shirt_d)
    c.rect(8, oy + 11, 2, 2, SKIN)
    c.vline(9, oy + 13, 5, shirt_d)
    c.hline(4, oy + 18, 10, PANTS_D)
    draw_head(c, 4, oy, look, 'down')
    c.rect(8, oy + 8, 2, 1, SKIN)
    c.p(7, oy + 8, OUT)
    c.rect(8, oy + 9, 2, 1, OUT)
    c.p(10, oy + 8, OUT)
    c.p(5, oy + 8, '#f0a58a')
    c.p(12, oy + 8, '#f0a58a')
    for sx, out in ((1, -1), (15, 1)):
        c.rect(sx, oy + 6, 2, 7, shirt_l)
        c.rect(sx + out, oy + 2, 2, 5, shirt_l)
        c.rect(sx + out, oy, 2, 2, SKIN)
    if wet:
        wet_front(c, oy + 19)
    return c.outline()


# ---------------------------------------------------------------- móveis

WOOD, WOOD_L, WOOD_D, WOOD_DD = '#a86a3c', '#c48650', '#7c4a27', '#5a341b'
TEAL, TEAL_L, TEAL_D = '#2f7f8a', '#45a0ab', '#1f5a62'
METAL, METAL_L, METAL_D = '#8c95a3', '#b4bcc8', '#5f6775'


def desk_top(c, x, y, w, h, face=6):
    c.rect(x, y, w, h, WOOD)
    c.hline(x, y, w, WOOD_L)
    c.rect(x, y + h, w, face, WOOD_D)
    c.hline(x, y + h, w, WOOD_DD)
    c.rect(x + 1, y + h + face, 2, 2, WOOD_DD)
    c.rect(x + w - 3, y + h + face, 2, 2, WOOD_DD)


def monitor_back(c, x, y):
    c.rect(x, y, 16, 9, '#3a3f4a')
    c.rect(x + 1, y + 1, 14, 1, '#545b68')
    c.rect(x + 6, y + 9, 4, 3, '#2a2e36')


def mug(c, x, y):
    c.rect(x, y, 3, 3, '#f1f1f1')
    c.p(x + 3, y + 1, '#d0d0d0')


def small_plant(c, x, y):
    c.rect(x + 1, y + 4, 4, 3, '#b8693b')
    for dx, dy in ((0, 1), (1, 0), (2, 1), (3, 0), (4, 1), (2, 2), (1, 3), (3, 3)):
        c.p(x + dx, y + dy, '#4c9a3a')


# Equipamentos pequenos em cima dos móveis (fase 2, missão 1: levantamento dos computadores).
# GADGETS guarda onde ficou cada um (px de arte, relativo ao canto do móvel) para o adesivo no mapa.
GADGETS = {}


def notebook_top(c, x, y, dark=False):
    """Notebook aberto em cima da mesa, visto por trás da tampa: 14 x 11."""
    body, edge = ('#3a3f4a', '#23262d') if dark else ('#c3c9d2', '#8c95a3')
    c.rect(x, y - 1, 14, 12, OUT)
    c.rect(x + 1, y, 12, 5, body)  # tampa aberta
    c.hline(x + 1, y + 4, 12, edge)
    c.rect(x + 6, y + 1, 2, 2, '#5f6775' if dark else '#eef1f5')  # logo
    c.rect(x, y + 5, 14, 6, body)  # base
    c.rect(x + 1, y + 5, 12, 3, '#2b2f37')  # teclado
    for i in range(5):
        c.p(x + 2 + i * 2, y + 6, '#4a505c')
    c.rect(x + 5, y + 9, 4, 1, edge)  # touchpad
    c.hline(x, y + 10, 14, edge)


def phone_top(c, x, y):
    """Celular deitado: 4 x 7."""
    c.rect(x - 1, y - 1, 6, 9, OUT)
    c.rect(x, y, 4, 7, '#1d2027')
    c.rect(x + 1, y + 1, 2, 5, '#3b6fb0')
    c.p(x + 1, y + 1, '#8fc1ff')


def tablet_top(c, x, y):
    """Tablet deitado (deitado na horizontal): 10 x 8."""
    c.rect(x - 1, y - 1, 12, 10, OUT)
    c.rect(x, y, 10, 8, '#1d2027')
    c.rect(x + 1, y + 1, 8, 6, '#6d5bd0')
    for i, col in enumerate(('#b7a8ff', '#ffd166', '#7ee08a')):
        c.p(x + 2 + i * 2, y + 2, col)
    c.hline(x + 2, y + 5, 6, '#4b3fa0')


def f_desk_pc(variant):
    c = Canvas(50, 30)
    desk_top(c, 1, 9, 48, 13)
    monitor_back(c, 17, 1)
    c.rect(18, 15, 14, 3, '#2b2f37')  # teclado
    for i in range(6):
        c.p(19 + i * 2, 16, '#4a505c')
    mug(c, 37 if variant % 2 else 8, 13)
    small_plant(c, 6 if variant % 2 else 40, 9)
    if variant % 3 == 0:
        c.rect(36, 16, 7, 4, '#f4f1e8')  # papéis
    return c.outline()


def f_desk_empty():
    """Mesa nova do RH, ainda vazia (missão 3)."""
    c = Canvas(50, 30)
    desk_top(c, 1, 9, 48, 13)
    return c.outline()


def f_desk_built(variant):
    """Mesa com o computador montado: monitor, webcam, caixas de som, teclado e mouse."""
    c = Canvas(50, 30)
    desk_top(c, 1, 9, 48, 13)
    monitor_back(c, 17, 1)
    c.rect(23, 0, 4, 1, '#2a2e36')  # webcam
    for x in (11, 35):  # caixas de som
        c.rect(x, 4, 4, 7, '#2b2f37')
        c.p(x + 1, 6, '#6b7280')
    c.rect(18, 15, 14, 3, '#2b2f37')  # teclado
    for i in range(6):
        c.p(19 + i * 2, 16, '#4a505c')
    c.rect(35, 15, 2, 3, '#d0d4d8')  # mouse
    c.rect(41 if variant else 4, 10, 6, 11, '#3a3f4a' if variant else '#d5d9de')  # gabinete na mesa
    c.vline(42 if variant else 5, 12, 2, '#4ade80')
    return c.outline()


def f_box(open_=False):
    """Caixa de papelão com o computador novo (fechada) ou já vazia (aberta)."""
    c = Canvas(24, 20)
    card, card_l, card_d = '#c8955a', '#ddb07a', '#9c6c38'
    if open_:
        c.rect(2, 8, 20, 11, card)
        c.rect(3, 9, 18, 3, '#7a5228')  # fundo vazio
        c.rect(0, 5, 4, 5, card_l)  # abas abertas
        c.rect(20, 5, 4, 5, card_l)
        c.rect(5, 4, 14, 3, card_d)
        c.hline(2, 18, 20, card_d)
        return c.outline()
    c.rect(2, 3, 20, 16, card)
    c.rect(2, 3, 20, 4, card_l)  # tampa
    c.rect(10, 3, 4, 16, '#e8d6a8')  # fita
    c.hline(2, 18, 20, card_d)
    c.rect(4, 10, 4, 3, '#5a3a1c')  # setinhas "este lado para cima"
    c.p(5, 9, '#5a3a1c')
    c.rect(16, 11, 4, 4, '#ffffff')  # etiqueta
    c.hline(17, 12, 2, '#9aa1ab')
    return c.outline()


def f_manager_desk():
    c = Canvas(60, 32)
    desk_top(c, 1, 9, 58, 15)
    monitor_back(c, 30, 1)
    c.rect(31, 17, 14, 3, '#2b2f37')
    c.rect(8, 13, 9, 6, '#f4f1e8')
    c.rect(9, 14, 7, 1, '#9aa1ab')
    c.rect(48, 12, 5, 7, '#7c3f28')  # livro
    small_plant(c, 20, 10)
    return c.outline()


def f_plant(big=False):
    w, h = (18, 30) if big else (14, 24)
    c = Canvas(w, h)
    pot_w = w - 6
    c.rect(3, h - 9, pot_w, 8, '#b8693b')
    c.hline(3, h - 9, pot_w, '#d0844f')
    c.rect(3, h - 3, pot_w, 2, '#8f4f2a')
    cx = w // 2
    leaves = [(-5, -4), (5, -4), (-3, -10), (3, -10), (0, -14), (-6, -9), (6, -9), (0, -7)]
    for lx, ly in leaves:
        for i in range(5):
            x = cx + round(lx * i / 4)
            y = h - 9 + round(ly * i / 4)
            c.p(x, y, '#3f8a34')
            c.p(x + (1 if lx >= 0 else -1), y, '#57ad45')
    c.p(cx, h - 9, '#2f6b28')
    return c.outline()


def f_bookshelf():
    c = Canvas(28, 36)
    c.rect(1, 1, 26, 34, WOOD_D)
    c.rect(2, 2, 24, 32, WOOD_DD)
    colors = ['#2f7f8a', '#c0583a', '#e0b84a', '#4a6fb0', '#6a9e3a', '#8b5aa8']
    for shelf in range(3):
        sy = 3 + shelf * 10
        x = 3
        i = shelf
        while x < 24:
            bw = 2 + (i % 2)
            bh = 7 - (i % 3)
            c.rect(x, sy + (8 - bh), bw, bh, colors[i % len(colors)])
            x += bw
            i += 1
        c.rect(2, sy + 8, 24, 2, WOOD)
    return c.outline()


def chair_top(c, x, y):
    """Cadeira vista por trás/cima (encosto): 10 x 8."""
    c.rect(x, y, 10, 7, TEAL)
    c.hline(x + 1, y + 1, 8, TEAL_L)
    c.hline(x, y + 6, 10, TEAL_D)


def chair_bottom(c, x, y):
    c.rect(x, y, 10, 6, TEAL)
    c.hline(x + 1, y, 8, TEAL_L)
    c.rect(x + 1, y + 6, 8, 2, TEAL_D)


def f_meeting_table():
    c = Canvas(116, 46)
    for i in range(5):
        chair_top(c, 10 + i * 21, 1)
    c.rect(4, 7, 108, 22, WOOD)
    c.hline(4, 7, 108, WOOD_L)
    c.rect(4, 29, 108, 4, WOOD_D)
    small_plant(c, 55, 13)
    for i, px_ in enumerate((20, 46, 80)):
        c.rect(px_, 16 + (i % 2) * 3, 8, 5, '#f4f1e8')
    # dois notebooks e um celular esquecido em cima da mesa
    notebook_top(c, 30, 10)
    notebook_top(c, 91, 10, dark=True)
    phone_top(c, 67, 18)
    GADGETS['mesa-reuniao'] = {'notebook-1': (37, 15), 'notebook-2': (98, 15), 'celular': (69, 21)}
    for i in range(5):
        chair_bottom(c, 10 + i * 21, 36)
    return c.outline()


def f_small_table(notebook=None):
    """Mesa pequena do RH e do Financeiro (com um notebook: 'claro' ou 'escuro')."""
    c = Canvas(44, 46)
    chair_top(c, 17, 1)
    c.rect(1, 15, 7, 12, TEAL)
    c.rect(36, 15, 7, 12, TEAL)
    c.rect(8, 7, 28, 22, WOOD)
    c.hline(8, 7, 28, WOOD_L)
    c.rect(8, 29, 28, 4, WOOD_D)
    if notebook:
        small_plant(c, 28, 9)
        notebook_top(c, 11, 14, dark=notebook == 'escuro')
        GADGETS[f'mesa-pequena-{notebook}'] = {'notebook': (18, 19)}
    else:
        small_plant(c, 19, 12)
    chair_bottom(c, 17, 36)
    return c.outline()


CARD_COLORS = ['#ffe27a', '#ff9fb8', '#9fd3ff', '#b5e48c', '#ffc27a']


def f_whiteboard(cards=True):
    """Quadro branco da sala de reuniões. Com os cards das frases colados (ou sem, depois do esbarrão)."""
    c = Canvas(36, 22)
    c.rect(1, 1, 34, 20, '#c3cad4')
    c.rect(2, 2, 32, 17, '#f7f8fa')
    c.rect(4, 3, 14, 1, '#4a6fb0')  # título escrito a caneta
    if cards:
        # três frases: pedaços de texto (linhas) e cards coloridos nas lacunas
        for row, (y, parts) in enumerate(((6, (4, 6, 5, 7)), (10, (6, 5, 8)), (14, (3, 7, 4, 6)))):
            x = 4
            for k, w in enumerate(parts):
                if k % 2:
                    c.rect(x, y - 1, w, 3, CARD_COLORS[(row + k) % len(CARD_COLORS)])
                else:
                    c.rect(x, y, w, 1, '#5b6170')
                x += w + 1
    else:
        for y, w in ((6, 18), (10, 13), (14, 20)):
            c.rect(4, y, w, 1, '#5b6170')
        for x, y in ((9, 5), (21, 9), (11, 13), (24, 13)):  # marquinhas de fita onde estavam os cards
            c.rect(x, y, 2, 1, '#d8dde3')
    c.rect(2, 19, 32, 2, '#9aa1ab')
    c.rect(26, 19, 4, 1, '#c0583a')  # caneta na bandeja
    return c.outline()


def f_whiteboard_letters():
    """Quadro branco com um caça-palavras escrito a caneta (fase 2, missão 2): grade de letras e palavras circuladas."""
    c = Canvas(36, 22)
    c.rect(1, 1, 34, 20, '#c3cad4')
    c.rect(2, 2, 32, 17, '#f7f8fa')
    c.rect(4, 3, 12, 1, '#4a6fb0')  # título
    for row in range(6):  # grade de "letras" (pontinhos de 1 px, alternando tons)
        for col in range(14):
            if noise(col, row, 7) < 0.85:
                c.p(5 + col * 2, 6 + row * 2, '#3b4252' if (col + row) % 3 else '#5b6170')
    c.rect(4, 5, 9, 3, '#f7f8fa')
    for col in range(4):
        c.p(5 + col * 2, 6, '#3b4252')
    for x, y, w, h, col in ((4, 5, 9, 3, '#e03131'), (20, 9, 3, 7, '#2f9e44')):  # palavras circuladas
        c.hline(x, y, w, col)
        c.hline(x, y + h - 1, w, col)
        c.vline(x, y, h, col)
        c.vline(x + w - 1, y, h, col)
    c.rect(2, 19, 32, 2, '#9aa1ab')
    c.rect(26, 19, 4, 1, '#2f6fd0')  # caneta na bandeja
    return c.outline()


def f_cards_floor():
    """Cards das frases caídos no chão."""
    c = Canvas(34, 12)
    spots = ((1, 6, 0), (6, 2, 1), (11, 7, 2), (16, 3, 3), (21, 8, 4), (26, 4, 0), (29, 8, 2))
    for x, y, k in spots:
        c.rect(x, y, 5, 3, CARD_COLORS[k])
        c.hline(x, y + 3, 5, '#7c838e')
    return c


def f_tv():
    c = Canvas(44, 20)
    c.rect(1, 1, 42, 18, '#2a2e36')
    c.rect(3, 3, 38, 14, '#3d6b8f')
    c.rect(6, 6, 14, 2, '#8fc1e3')
    c.rect(6, 10, 22, 2, '#8fc1e3')
    return c.outline()


def f_window():
    c = Canvas(30, 18)
    c.rect(1, 1, 28, 16, '#5c6b78')
    c.rect(2, 2, 26, 13, '#8ec6d8')
    c.rect(4, 8, 4, 7, '#6a8fa6')
    c.rect(10, 5, 5, 10, '#6a8fa6')
    c.rect(18, 9, 6, 6, '#6a8fa6')
    c.vline(15, 2, 13, '#5c6b78')
    for y in range(2, 6):
        c.hline(2, y, 26, '#d8c39a' if y % 2 == 0 else '#bfa77a')  # persiana
    return c.outline()


def f_picture():
    c = Canvas(20, 16)
    c.rect(1, 1, 18, 14, WOOD_D)
    c.rect(3, 3, 14, 10, '#9fd0e0')
    c.rect(3, 9, 14, 4, '#5c9a4a')
    c.rect(11, 5, 3, 3, '#f2d36b')
    return c.outline()


def f_copier():
    c = Canvas(28, 30)
    c.rect(1, 5, 26, 24, '#d6dae0')
    c.rect(1, 5, 26, 3, '#eef0f3')
    c.rect(3, 1, 22, 6, '#c3c8cf')
    c.rect(5, 2, 12, 3, '#6a737f')
    c.rect(19, 10, 6, 4, '#3a3f4a')
    c.p(20, 11, '#59d18f')
    c.rect(3, 16, 22, 3, METAL)
    c.rect(3, 21, 22, 3, METAL)
    c.rect(3, 26, 22, 2, METAL_D)
    phone_top(c, 19, 1)  # celular esquecido em cima da copiadora
    GADGETS['copiadora'] = {'celular': (21, 4)}
    return c.outline()


def f_cabinet(color='#596678', tablet=False):
    """Arquivo de gavetas. Com `tablet`, tem um tablet de consulta em pé num suporte em cima (9 px mais alto)."""
    top = 9 if tablet else 0
    c = Canvas(16, 28 + top)
    c.rect(1, 1 + top, 14, 26, color)
    c.hline(1, 1 + top, 14, '#8592a5')
    for i in range(3):
        y = 4 + top + i * 8
        c.rect(2, y, 12, 7, '#4c586a')
        c.hline(2, y + 6, 12, '#3a4352')
        c.rect(6, y + 2, 4, 2, '#c3cad4')
    if tablet:
        c.rect(7, 7, 2, 3, '#2a2e36')  # suporte
        c.rect(4, 9, 8, 1, '#2a2e36')
        c.rect(2, 0, 12, 8, '#1d2027')
        c.rect(3, 1, 10, 6, '#3f8fd6')
        for i, col in enumerate(('#ffd166', '#7ee08a', '#ff8fa3', '#ffffff')):
            c.p(4 + i * 2, 2, col)
        c.hline(4, 5, 8, '#2a6aa8')
        GADGETS['arquivo-tablet'] = {'tablet': (8, 4)}
    return c.outline()


def f_shelf_boxes():
    c = Canvas(30, 32)
    c.rect(1, 1, 28, 30, WOOD_D)
    c.rect(2, 2, 26, 28, WOOD_DD)
    for row in range(3):
        y = 3 + row * 9
        for i in range(3):
            col = ['#d8b07a', '#c49a62', '#e6c48f'][(i + row) % 3]
            c.rect(3 + i * 8, y + 2, 7, 6, col)
            c.hline(3 + i * 8, y + 2, 7, '#f0d8a8')
        c.rect(2, y + 8, 26, 1, WOOD)
    return c.outline()


def f_server():
    c = Canvas(20, 36)
    c.rect(1, 1, 18, 34, '#2a2e36')
    c.rect(2, 2, 16, 32, '#1d2027')
    for i in range(6):
        y = 4 + i * 5
        c.rect(3, y, 14, 4, '#363b45')
        c.p(4, y + 1, '#59d18f' if i % 2 else '#7fd0ff')
        c.p(6, y + 1, '#ffae00' if i % 3 == 0 else '#59d18f')
        c.hline(9, y + 2, 7, '#4a505c')
    return c.outline()


def f_mainframe():
    """Mainframe: dois gabinetes grandes lado a lado, com painel, luzes e grade de ventilação."""
    c = Canvas(42, 46)
    for i, x in enumerate((1, 21)):
        c.rect(x, 3, 20, 42, '#15181e')
        c.rect(x + 1, 4, 18, 40, '#262a32')
        c.hline(x + 1, 4, 18, '#454b57')
        for yy in range(16 if i == 0 else 9, 41, 3):
            c.hline(x + 3, yy, 12, '#343943')
        c.vline(x + 17, 7, 34, '#7fd0ff' if i == 0 else '#59d18f')  # faixa de luz
        c.vline(x + 16, 7, 34, '#1f3550' if i == 0 else '#1f4a33')
    c.rect(1, 0, 40, 4, '#2f5f9e')  # faixa azul no topo
    c.hline(1, 0, 40, '#457bc0')
    c.rect(4, 8, 11, 6, '#0f2a1a')  # visor de status
    c.hline(5, 10, 8, '#7ee08a')
    c.hline(5, 12, 5, '#7ee08a')
    for k, col in enumerate(('#59d18f', '#ffae00', '#7fd0ff', '#59d18f')):
        c.p(24 + k * 3, 6, col)
    return c.outline()


STICKER_COLORS = {
    'desktop': '#2f7bd9', 'notebook': '#22a35a', 'servidor': '#8b5cf6',
    'mainframe': '#e8590c', 'tablet': '#eab308', 'smartphone': '#ec4899',
}


def f_sticker(color):
    """Adesivo de etiquetagem colado no equipamento (visto no mapa): 6 x 5."""
    c = Canvas(6, 5)
    c.rect(0, 0, 6, 5, OUT)
    c.rect(1, 1, 4, 3, color)
    c.hline(1, 2, 4, '#ffffff')
    return c


def f_counter():
    c = Canvas(76, 30)
    c.rect(1, 8, 74, 6, '#9b6a40')  # tampo
    c.hline(1, 8, 74, '#b9825a')
    c.rect(1, 14, 74, 15, '#6f7782')  # armários
    for i in range(6):
        c.vline(1 + i * 12, 14, 15, '#555c66')
        c.rect(5 + i * 12, 19, 4, 1, '#c3cad4')
    c.rect(4, 1, 14, 10, '#3a3f4a')  # micro-ondas
    c.rect(6, 3, 8, 5, '#20242b')
    c.rect(26, 9, 14, 4, '#b4bcc8')  # pia
    c.rect(28, 10, 10, 2, '#7e8794')
    c.rect(32, 4, 2, 6, '#9aa1ab')
    c.rect(50, 0, 10, 12, '#2b2f37')  # cafeteira
    c.rect(52, 6, 6, 4, '#5a3a22')
    mug(c, 63, 9)
    phone_top(c, 43, 6)  # celular carregando
    c.vline(45, 13, 3, '#f4f6f8')
    GADGETS['bancada'] = {'celular': (45, 9)}
    return c.outline()


def f_fridge():
    c = Canvas(20, 36)
    c.rect(1, 1, 18, 34, '#dfe3e8')
    c.hline(1, 1, 18, '#f4f6f8')
    c.hline(1, 13, 18, '#aab2bd')
    c.rect(15, 5, 2, 5, '#9aa1ab')
    c.rect(15, 17, 2, 9, '#9aa1ab')
    return c.outline()


def f_cooler():
    c = Canvas(14, 30)
    c.rect(3, 1, 8, 11, '#8fd3ec')
    c.rect(4, 2, 3, 8, '#c8eef8')
    c.rect(1, 12, 12, 17, '#e6e9ee')
    c.rect(4, 17, 6, 4, '#3a6f8f')
    c.p(5, 18, '#e6e9ee')
    return c.outline()


def f_armchair():
    c = Canvas(20, 20)
    c.rect(1, 1, 18, 8, TEAL_D)
    c.rect(1, 6, 4, 12, TEAL)
    c.rect(15, 6, 4, 12, TEAL)
    c.rect(5, 8, 10, 9, TEAL_L)
    c.rect(1, 17, 18, 2, TEAL_D)
    return c.outline()


def f_round_table(tablet=False):
    c = Canvas(20, 20)
    c.rect(3, 2, 14, 12, WOOD)
    c.rect(2, 4, 16, 8, WOOD)
    c.hline(4, 2, 12, WOOD_L)
    c.rect(4, 14, 12, 2, WOOD_D)
    c.rect(9, 14, 2, 5, WOOD_DD)
    if tablet:
        tablet_top(c, 5, 4)
        GADGETS['mesinha-tablet'] = {'tablet': (10, 8)}
    else:
        small_plant(c, 7, 2)
    return c.outline()


def f_reception():
    c = Canvas(84, 30)
    c.rect(1, 8, 82, 10, '#9b6a40')
    c.hline(1, 8, 82, '#b9825a')
    c.rect(1, 18, 82, 11, WOOD_D)
    c.hline(1, 18, 82, WOOD_DD)
    for i in range(4):
        c.vline(10 + i * 21, 19, 9, WOOD_DD)
    monitor_back(c, 50, 0)
    c.rect(22, 11, 10, 4, '#f4f1e8')
    small_plant(c, 8, 4)
    c.rect(66, 10, 8, 6, '#2b2f37')  # telefone
    return c.outline()


def f_trash():
    c = Canvas(10, 12)
    c.rect(1, 1, 8, 10, '#4a5a6c')
    c.rect(1, 1, 8, 2, '#2a2e36')
    c.hline(2, 4, 6, '#5d6f84')
    return c.outline()


def f_rug():
    c = Canvas(76, 44)
    c.rect(0, 0, 76, 44, '#7a4a3a')
    c.rect(2, 2, 72, 40, '#3c5a7a')
    c.rect(5, 5, 66, 34, '#47698d')
    for x in range(6, 70, 4):
        c.p(x, 4, '#c9a46a')
        c.p(x, 39, '#c9a46a')
    return c


def f_bulletin():
    c = Canvas(30, 20)
    c.rect(1, 1, 28, 18, WOOD_D)
    c.rect(2, 2, 26, 15, '#c8a070')
    for i, (x, y, col) in enumerate(((4, 4, '#f7f1a8'), (11, 6, '#a8d8f7'), (18, 3, '#f7c1a8'), (22, 9, '#f7f8fa'), (6, 10, '#c1f7b0'))):
        c.rect(x, y, 5, 5, col)
        c.p(x + 2, y, '#c0392b')
    return c.outline()


def f_clock():
    c = Canvas(12, 12)
    c.rect(2, 1, 8, 10, WOOD_D)
    c.rect(1, 2, 10, 8, WOOD_D)
    c.rect(3, 2, 6, 8, '#f7f8fa')
    c.rect(2, 3, 8, 6, '#f7f8fa')
    c.vline(6, 3, 3, OUT)
    c.hline(6, 6, 2, OUT)
    return c.outline()


# ---------------------------------------------------------------- fase 3, missão 5: o aperto no banheiro

PORCELAIN, PORCELAIN_L, PORCELAIN_D = '#f4f7f9', '#ffffff', '#c6d0d8'

# Letras 3 x 5 para as palavras escritas na parede do banheiro.
FONT3 = {
    'A': ('###', '#.#', '###', '#.#', '#.#'), 'B': ('##.', '#.#', '##.', '#.#', '##.'),
    'C': ('###', '#..', '#..', '#..', '###'), 'D': ('##.', '#.#', '#.#', '#.#', '##.'),
    'I': ('###', '.#.', '.#.', '.#.', '###'), 'M': ('#.#', '###', '###', '#.#', '#.#'),
    'P': ('###', '#.#', '###', '#..', '#..'), 'R': ('##.', '#.#', '##.', '#.#', '#.#'),
    'S': ('###', '#..', '###', '..#', '###'), 'T': ('###', '.#.', '.#.', '.#.', '.#.'),
    'U': ('#.#', '#.#', '#.#', '#.#', '###'), 'L': ('#..', '#..', '#..', '#..', '###'),
    'N': ('##.', '#.#', '#.#', '#.#', '#.#'), 'O': ('###', '#.#', '#.#', '#.#', '###'),
}


def write3(c, text, x, y, color):
    for ch in text:
        for dy, row in enumerate(FONT3[ch]):
            for dx, v in enumerate(row):
                if v == '#':
                    c.p(x + dx, y + dy, color)
        x += 4


def f_urinal():
    """Mictório de porcelana pendurado na parede, com o cano da descarga em cima: 12 x 22."""
    c = Canvas(12, 22)
    c.rect(5, 0, 2, 5, METAL_L)  # cano
    c.p(6, 0, METAL)
    c.rect(4, 4, 4, 2, METAL)  # botão da descarga
    c.rect(1, 6, 10, 12, PORCELAIN)
    c.rect(2, 18, 8, 2, PORCELAIN)
    c.rect(3, 20, 6, 1, PORCELAIN_D)
    c.vline(1, 7, 10, PORCELAIN_L)
    c.vline(10, 7, 11, PORCELAIN_D)
    c.rect(3, 9, 6, 8, '#dfe7ec')  # bacia
    c.rect(4, 10, 4, 6, '#cfdae1')
    c.rect(5, 15, 2, 1, '#9fb0bc')  # ralinho
    return c.outline()


def f_wall_words():
    """Palavras rabiscadas de caneta na parede do banheiro, em cima dos mictórios: 46 x 14."""
    c = Canvas(46, 14)
    write3(c, 'CPU', 1, 1, '#2f5f9e')
    write3(c, 'RAM', 17, 0, '#c0392b')
    write3(c, 'BIT', 33, 1, '#2d7a3e')
    write3(c, 'SSD', 6, 8, '#6b3fa0')
    write3(c, 'USB', 26, 8, '#1c1626')
    for x in range(19, 24):  # coraçãozinho e risquinhos
        c.p(x, 10 + (x % 2), '#c0392b')
    c.p(42, 9, '#2f5f9e')
    c.p(43, 10, '#2f5f9e')
    c.p(44, 9, '#2f5f9e')
    return c


def f_wc_sign():
    """Plaquinha azul do banheiro na parede do corredor (bonequinho branco): 10 x 10."""
    c = Canvas(10, 10)
    c.rect(0, 0, 10, 10, '#2f5f9e')
    c.rect(1, 1, 8, 8, '#457bc0')
    c.rect(4, 2, 2, 2, '#ffffff')  # cabeça
    c.rect(3, 4, 4, 3, '#ffffff')  # corpo
    c.rect(3, 7, 1, 2, '#ffffff')  # pernas
    c.rect(6, 7, 1, 2, '#ffffff')
    return c.outline()


def f_puddle():
    """Pocinha amarela no chão (não deu tempo!): 20 x 8."""
    c = Canvas(20, 8)
    c.rect(3, 1, 13, 6, '#efdc7a')
    c.rect(1, 2, 17, 4, '#efdc7a')
    c.rect(15, 4, 4, 3, '#efdc7a')
    c.rect(4, 2, 4, 1, '#fff6c2')
    c.p(12, 3, '#fff6c2')
    return c.outline(hexc('cdb44f'))


def f_urge():
    """Balão de pensamento com uma gota azul (vontade de fazer xixi), em cima da cabeça: 14 x 18."""
    c = Canvas(14, 18)
    c.rect(2, 1, 10, 11, '#ffffff')
    c.rect(1, 2, 12, 9, '#ffffff')
    c.p(4, 14, '#ffffff')  # bolinhas do pensamento
    c.rect(5, 13, 2, 1, '#ffffff')
    c.p(3, 16, '#ffffff')
    c.p(7, 3, '#3ea7e8')  # gota
    c.rect(6, 4, 3, 2, '#3ea7e8')
    c.rect(5, 6, 5, 3, '#3ea7e8')
    c.rect(6, 9, 3, 1, '#2a86c4')
    c.p(6, 6, '#bfe6ff')
    return c.outline()


# ---------------------------------------------------------------- montagem

# ---------------------------------------------------------------- fase 2: imagens grandes dos equipamentos
# Usadas no modal do levantamento (80 x 56 pixels de arte, salvas ampliadas 4x).

BIG = 4


def wallpaper(c, x, y, w, h, sky='#3b82c4', hill='#2f9e6b', hill2='#25845a', sun='#ffe27a'):
    """Papel de parede simples: céu, sol e dois morros."""
    c.rect(x, y, w, h, sky)
    for yy in range(h // 3):
        c.hline(x, y + yy, w, sky)
    c.rect(x + w - 8, y + 2, 4, 4, sun)
    for xx in range(w):
        h1 = int(h * 0.45 + 3 * ((xx * 7 % 23) / 23) - abs(xx - w * 0.3) * 0.25)
        h2 = int(h * 0.30 - abs(xx - w * 0.75) * 0.2)
        for yy in range(max(0, h - max(h1, 0)), h):
            c.p(x + xx, y + yy, hill2 if yy > h - h2 else hill)


def app_icons(c, x, y, cols, rows, size=3, gap=2):
    cores = ['#ff6b6b', '#ffd166', '#06d6a0', '#4dabf7', '#b197fc', '#ff922b', '#f783ac', '#ffffff']
    for r in range(rows):
        for k in range(cols):
            c.rect(x + k * (size + gap), y + r * (size + gap), size, size, cores[(r * cols + k) % len(cores)])


def keyboard(c, x, y, w, body='#2b2f37', key='#4a505c', rows=2):
    c.rect(x, y, w, 2 + rows * 2, OUT)
    c.rect(x + 1, y + 1, w - 2, rows * 2, body)
    for r in range(rows):
        for k in range(x + 2, x + w - 2, 2):
            c.p(k, y + 1 + r * 2, key)


def big_monitor(c, x, y, w, h, frame='#23262d'):
    c.rect(x - 1, y - 1, w + 2, h + 2, OUT)
    c.rect(x, y, w, h, frame)
    wallpaper(c, x + 2, y + 2, w - 4, h - 5)
    c.hline(x + 2, y + h - 3, w - 4, '#1f2a4d')  # barra de tarefas
    c.rect(x + 3, y + h - 3, 2, 1, '#4dabf7')


def big_desktop_tower():
    """Desktop: monitor, gabinete (torre) ao lado, teclado e mouse."""
    c = Canvas(80, 56)
    big_monitor(c, 8, 4, 40, 28)
    c.rect(25, 33, 6, 6, '#3a3f4a')  # pé
    c.rect(18, 39, 20, 2, '#3a3f4a')
    # gabinete
    c.rect(55, 8, 18, 36, OUT)
    c.rect(56, 9, 16, 34, '#d5d9de')
    c.vline(56, 9, 34, '#eef0f3')
    c.rect(58, 12, 12, 3, '#9aa1ab')  # leitor de DVD
    c.hline(59, 13, 6, '#6b7280')
    c.rect(62, 19, 4, 4, '#6b7280')  # botão liga
    c.rect(63, 20, 2, 2, '#4dabf7')
    for k in range(3):
        c.rect(59 + k * 3, 27, 2, 1, '#3a3f4a')  # USB
    for yy in range(32, 41, 2):
        c.hline(59, yy, 10, '#b4bcc8')  # ventilação
    keyboard(c, 10, 45, 36)
    c.rect(50, 46, 4, 6, OUT)
    c.rect(51, 47, 2, 4, '#d0d4d8')
    return c


def big_desktop_aio():
    """Desktop tudo-em-um: o computador fica atrás da tela."""
    c = Canvas(80, 56)
    c.rect(13, 1, 54, 38, OUT)
    c.rect(14, 2, 52, 36, '#e9edf2')
    wallpaper(c, 16, 4, 48, 27, sky='#4cc3d9', hill='#3aa17e', hill2='#2c7f63')
    c.rect(38, 33, 4, 2, '#b4bcc8')  # logo na "barriga"
    c.rect(34, 39, 12, 6, '#c3cad4')  # pé
    c.rect(28, 45, 24, 2, '#9aa1ab')
    keyboard(c, 18, 48, 40, body='#eef0f3', key='#c3cad4', rows=1)
    c.rect(62, 48, 4, 5, OUT)
    c.rect(63, 49, 2, 3, '#ffffff')
    return c


def big_desktop_kit():
    """Desktop montado na missão 3: gabinete na mesa, monitor, webcam, caixas de som, teclado e mouse."""
    c = Canvas(80, 56)
    c.rect(4, 8, 16, 34, OUT)
    c.rect(5, 9, 14, 32, '#3a3f4a')
    c.rect(7, 12, 10, 2, '#23262d')
    c.rect(10, 18, 4, 4, '#23262d')
    c.rect(11, 19, 2, 2, '#4ade80')
    big_monitor(c, 26, 6, 36, 25)
    c.rect(41, 3, 6, 3, OUT)  # webcam
    c.rect(42, 4, 4, 1, '#23262d')
    c.rect(41, 32, 6, 6, '#3a3f4a')
    c.rect(35, 38, 18, 2, '#3a3f4a')
    c.rect(66, 22, 8, 16, OUT)  # caixa de som
    c.rect(67, 23, 6, 14, '#2b2f37')
    c.rect(68, 26, 4, 4, '#6b7280')
    c.rect(68, 32, 4, 3, '#6b7280')
    keyboard(c, 24, 45, 36)
    c.rect(64, 46, 4, 6, OUT)
    c.rect(65, 47, 2, 4, '#d0d4d8')
    return c


def big_notebook(dark=False):
    """Notebook aberto: tela e teclado juntos, com bateria."""
    body, edge, kb = ('#3a3f4a', '#23262d', '#1d2027') if dark else ('#c3c9d2', '#8c95a3', '#2b2f37')
    c = Canvas(80, 56)
    c.rect(17, 2, 46, 32, OUT)
    c.rect(18, 3, 44, 30, body)
    if dark:
        wallpaper(c, 20, 5, 40, 26, sky='#6d5bd0', hill='#b197fc', hill2='#845ef7', sun='#ffd166')
    else:
        wallpaper(c, 20, 5, 40, 26)
    c.p(40, 4, '#1d2027')  # webcam
    c.hline(18, 33, 44, edge)
    for i in range(14):  # base em perspectiva
        x0 = 17 - (i * 9) // 13
        c.hline(x0 - 1, 34 + i, 46 + 2 * ((i * 9) // 13) + 2, OUT)
        c.hline(x0, 34 + i, 46 + 2 * ((i * 9) // 13), body)
    for r in range(4):
        x0 = 21 - (r * 2 + 1) * 9 // 13
        for k in range(x0, 80 - x0 - 1, 3):
            c.rect(k, 35 + r * 2, 2, 1, kb)
    c.rect(33, 44, 14, 3, edge)  # touchpad
    c.hline(8, 47, 64, edge)
    return c


def big_server():
    """Servidor em rack: várias gavetas com discos e luzes, sem tela nem teclado."""
    c = Canvas(80, 56)
    c.rect(22, 0, 36, 56, OUT)
    c.rect(23, 1, 34, 55, '#1d2027')
    c.vline(24, 1, 55, '#3a3f4a')
    c.vline(55, 1, 55, '#3a3f4a')
    for i in range(6):
        y = 3 + i * 8
        c.rect(26, y, 28, 7, '#363b45')
        c.hline(26, y, 28, '#4a505c')
        c.rect(26, y + 1, 2, 5, '#9aa1ab')  # alças
        c.rect(52, y + 1, 2, 5, '#9aa1ab')
        for k in range(4):
            c.rect(30 + k * 4, y + 2, 3, 3, '#262a32')  # discos
            c.p(31 + k * 4, y + 3, '#59d18f' if (i + k) % 3 else '#ffae00')
        c.p(48, y + 2, '#7fd0ff')
        c.p(48, y + 4, '#59d18f')
    c.rect(26, 51, 28, 4, '#2a2e36')
    return c


def big_mainframe():
    """Mainframe: gabinetes enormes que processam milhões de operações."""
    c = Canvas(80, 56)
    for i, x in enumerate((4, 41)):
        c.rect(x, 0, 35, 56, OUT)
        c.rect(x + 1, 4, 33, 52, '#262a32')
        c.hline(x + 1, 4, 33, '#454b57')
        for yy in range(22 if i == 0 else 10, 54, 3):
            c.hline(x + 4, yy, 22, '#343943')
        c.vline(x + 30, 8, 44, '#7fd0ff' if i == 0 else '#59d18f')
        c.vline(x + 29, 8, 44, '#1f3550' if i == 0 else '#1f4a33')
    c.rect(4, 0, 72, 4, '#2f5f9e')
    c.hline(4, 0, 72, '#457bc0')
    c.rect(8, 8, 20, 10, '#0f2a1a')
    for k, w in enumerate((14, 9, 12)):
        c.hline(10, 10 + k * 3, w, '#7ee08a')
    for k, col in enumerate(('#59d18f', '#ffae00', '#7fd0ff', '#59d18f', '#ff6b6b')):
        c.p(46 + k * 4, 7, col)
    return c


def big_tablet():
    """Tablet: tela sensível ao toque, sem teclado."""
    c = Canvas(80, 56)
    c.rect(7, 7, 66, 42, OUT)
    c.rect(8, 8, 64, 40, '#1d2027')
    for x, y in ((8, 8), (71, 8), (8, 47), (71, 47)):
        c.p(x, y, OUT)
    c.p(10, 28, '#3a3f4a')  # câmera
    wallpaper(c, 13, 11, 55, 34, sky='#6d5bd0', hill='#b197fc', hill2='#845ef7', sun='#ffd166')
    app_icons(c, 17, 14, 8, 3, size=4, gap=2)
    c.rect(22, 40, 37, 4, '#ffffff')
    app_icons(c, 24, 41, 6, 1, size=2, gap=4)
    return c


def big_phone():
    """Smartphone: computador de bolso, também faz ligações."""
    c = Canvas(80, 56)
    c.rect(27, 1, 26, 54, OUT)
    c.rect(28, 2, 24, 52, '#1d2027')
    for x, y in ((28, 2), (51, 2), (28, 53), (51, 53)):
        c.p(x, y, OUT)
    wallpaper(c, 30, 4, 20, 48, sky='#ff922b', hill='#e8590c', hill2='#c2410c', sun='#fff3bf')
    c.rect(36, 4, 8, 2, '#1d2027')  # entalhe da câmera
    c.hline(31, 7, 4, '#ffffff')
    app_icons(c, 31, 11, 4, 4, size=3, gap=2)
    c.rect(31, 45, 18, 4, '#ffffff')
    app_icons(c, 32, 46, 4, 1, size=2, gap=3)
    c.hline(36, 51, 8, '#ffffff')
    return c


def make_equipamentos():
    out = os.path.join(ASSETS, 'equipamentos')
    os.makedirs(out, exist_ok=True)
    imgs = {
        'desktop-torre': big_desktop_tower(), 'desktop-tudo-em-um': big_desktop_aio(),
        'desktop-montado': big_desktop_kit(), 'notebook-claro': big_notebook(),
        'notebook-escuro': big_notebook(True), 'servidor': big_server(), 'mainframe': big_mainframe(),
        'tablet': big_tablet(), 'smartphone': big_phone(),
    }
    for name, cv in imgs.items():
        cv.im.resize((cv.w * BIG, cv.h * BIG), Image.NEAREST).save(os.path.join(out, f'{name}.png'), optimize=True)


# ---------------------------------------------------------------- fase 2, missão 3: placas de desenvolvimento

ARDU, ARDU_L, ARDU_D = '#1f7fae', '#3aa0d0', '#155a7c'
RASP, RASP_L, RASP_D = '#2f8f4a', '#4cae66', '#1f6634'
GOLD = '#e0b84a'


def f_cabinet_doors():
    """Armário de madeira com duas portas (Sala de Reuniões)."""
    c = Canvas(24, 34)
    c.rect(1, 1, 22, 32, WOOD_D)
    c.hline(1, 1, 22, WOOD)
    c.rect(2, 3, 9, 28, WOOD)
    c.rect(13, 3, 9, 28, WOOD)
    c.vline(11, 3, 28, WOOD_DD)
    c.vline(12, 3, 28, WOOD_DD)
    for x in (9, 14):
        c.rect(x, 15, 1, 4, '#d8dde3')
    c.rect(4, 0, 8, 2, '#c8955a')  # caixa em cima
    return c.outline()


def f_board_floor(kind):
    """Placa caída no chão (vista de cima): Arduino azul ou Raspberry Pi verde, 10 x 7."""
    c = Canvas(10, 7)
    body, light = (ARDU, ARDU_L) if kind == 'arduino' else (RASP, RASP_L)
    c.rect(0, 0, 10, 7, body)
    c.hline(0, 0, 10, light)
    c.rect(3, 2, 3, 3, '#1d2027')  # chip
    for x in range(1, 9, 2):
        c.p(x, 6 if kind == 'arduino' else 1, GOLD)
    c.rect(8, 2, 2, 2, '#c3c9d2')  # conector
    return c.outline()


def f_board_glow():
    """Brilho amarelo em volta da placa no chão (destaque, mistura aditiva)."""
    w, h = 26, 20
    c = Canvas(w, h)
    for y in range(h):
        for x in range(w):
            d = ((x - w / 2 + 0.5) / (w / 2)) ** 2 + ((y - h / 2 + 0.5) / (h / 2)) ** 2
            if d < 1:
                c.p(x, y, (255, 214, 80, int(170 * (1 - d) ** 1.4)))
    return c


def f_magnifier():
    """Lupa em cima dos armários onde dá para procurar."""
    c = Canvas(14, 14)
    c.rect(2, 1, 8, 8, '#ffffff')
    c.rect(1, 2, 10, 6, '#ffffff')
    c.rect(3, 2, 6, 6, '#9fd3ff')
    c.rect(4, 3, 2, 2, '#ffffff')
    for k in range(4):
        c.rect(8 + k, 8 + k, 2, 2, '#6b4a2b')
    c = c.outline()
    return c


def f_mess(kind):
    """Coisas que saem voando do armário quando o ESTAGIÁRIO procura."""
    sizes = {'papel': (7, 5), 'pasta': (8, 6), 'caixa': (7, 6), 'cabo': (8, 5), 'livro': (7, 6), 'grampeador': (7, 4)}
    w, h = sizes[kind]
    c = Canvas(w, h)
    if kind == 'papel':
        c.rect(0, 0, w, h, '#f4f1e8')
        c.hline(1, 1, 4, '#9aa1ab')
        c.hline(1, 3, 5, '#9aa1ab')
    elif kind == 'pasta':
        c.rect(0, 1, w, h - 1, '#e0b84a')
        c.rect(0, 0, 3, 1, '#e0b84a')
        c.hline(0, h - 1, w, '#b38a2a')
    elif kind == 'caixa':
        c.rect(0, 0, w, h, '#c8955a')
        c.rect(3, 0, 1, h, '#e8d6a8')
    elif kind == 'cabo':
        for x, y in ((1, 1), (2, 0), (3, 0), (4, 1), (5, 2), (6, 3), (5, 4), (3, 4), (2, 3), (3, 2)):
            c.p(x, y, '#1d2027')
        c.p(7, 3, '#c3c9d2')
    elif kind == 'livro':
        c.rect(0, 0, w, h, '#b03a3a')
        c.vline(1, 0, h, '#822828')
        c.hline(2, 2, 4, '#f4f1e8')
    else:
        c.rect(0, 1, w, 3, '#596678')
        c.rect(0, 0, w - 1, 1, '#8592a5')
    return c.outline()


def headers(c, x, y, n, vertical=False):
    for k in range(n):
        if vertical:
            c.rect(x, y + k * 2, 2, 1, '#1d2027')
            c.p(x, y + k * 2, GOLD)
        else:
            c.rect(x + k * 2, y, 1, 2, '#1d2027')
            c.p(x + k * 2, y + 1, GOLD)


def big_arduino(kind):
    c = Canvas(80, 56)
    if kind == 'uno':
        x, y, w, h = 14, 8, 52, 40
    elif kind == 'nano':
        x, y, w, h = 28, 12, 22, 34
    else:  # mega
        x, y, w, h = 4, 12, 72, 32
    c.rect(x - 1, y - 1, w + 2, h + 2, OUT)
    c.rect(x, y, w, h, ARDU)
    c.hline(x, y, w, ARDU_L)
    c.hline(x, y + h - 1, w, ARDU_D)
    for hx, hy in ((x + 2, y + 2), (x + w - 4, y + 2), (x + 2, y + h - 4), (x + w - 4, y + h - 4)):
        c.rect(hx, hy, 2, 2, '#f7f8fa')  # furos de parafuso
    if kind == 'nano':
        c.rect(x + 7, y - 3, 8, 5, '#c3c9d2')  # mini USB
        headers(c, x + 1, y + 6, 13, vertical=True)
        headers(c, x + w - 3, y + 6, 13, vertical=True)
        c.rect(x + 7, y + 14, 8, 8, '#1d2027')
        c.p(x + 8, y + 8, '#ff6b6b')
        return c
    c.rect(x - 4, y + 5, 12, 10, '#c3c9d2')  # USB-B
    c.rect(x - 3, y + 7, 9, 6, '#9aa1ab')
    c.rect(x - 3, y + h - 14, 10, 9, '#1d2027')  # conector de energia
    headers(c, x + 14, y + 2, (w - 18) // 2)
    headers(c, x + 18, y + h - 4, (w - 22) // 2)
    if kind == 'mega':
        headers(c, x + w - 6, y + 6, 10, vertical=True)
        headers(c, x + w - 9, y + 6, 10, vertical=True)
    c.rect(x + w // 2 - 6, y + h // 2 - 3, 18, 7, '#1d2027')  # microcontrolador
    for k in range(8):
        c.p(x + w // 2 - 5 + k * 2, y + h // 2 - 4, '#9aa1ab')
        c.p(x + w // 2 - 5 + k * 2, y + h // 2 + 4, '#9aa1ab')
    c.rect(x + 14, y + 8, 4, 2, '#c3c9d2')  # botão reset
    c.p(x + 22, y + 9, '#59d18f')  # LED
    c.hline(x + 22, y + h // 2 + 8, 12, '#f7f8fa')  # "logo" escrito
    return c


def big_raspberry(kind):
    c = Canvas(80, 56)
    if kind == 'pi4':
        x, y, w, h = 8, 8, 60, 40
    elif kind == 'zero':
        x, y, w, h = 8, 16, 64, 24
    else:  # pico
        x, y, w, h = 28, 4, 22, 48
    c.rect(x - 1, y - 1, w + 2, h + 2, OUT)
    c.rect(x, y, w, h, RASP)
    c.hline(x, y, w, RASP_L)
    c.hline(x, y + h - 1, w, RASP_D)
    if kind == 'pico':
        c.rect(x + 7, y - 3, 8, 5, '#c3c9d2')  # micro USB
        for k in range(20):  # furinhos castelados dos lados
            c.p(x, y + 3 + k * 2, GOLD)
            c.p(x + w - 1, y + 3 + k * 2, GOLD)
        c.rect(x + 6, y + 18, 10, 10, '#1d2027')
        c.rect(x + 8, y + 9, 3, 2, '#f7f8fa')  # botão BOOTSEL
        return c
    for hx, hy in ((x + 2, y + 2), (x + w - 4, y + 2), (x + 2, y + h - 4), (x + w - 4, y + h - 4)):
        c.rect(hx, hy, 2, 2, GOLD)
    headers(c, x + 6, y + 2, 20)  # GPIO de 40 pinos (2 fileiras)
    headers(c, x + 6, y + 4, 20)
    if kind == 'pi4':
        c.rect(x + w - 2, y + 4, 12, 9, '#c3c9d2')  # USB
        c.rect(x + w - 2, y + 15, 12, 9, '#c3c9d2')
        c.rect(x + w - 2, y + 27, 12, 10, '#d8dde3')  # rede (ethernet)
        c.rect(x + w, y + 30, 8, 5, '#9aa1ab')
        c.rect(x + 18, y + 14, 12, 12, '#c3c9d2')  # processador com tampa metálica
        c.rect(x + 34, y + 16, 8, 8, '#1d2027')  # memória
        for k, hx in enumerate((x + 6, x + 20, x + 30)):
            c.rect(hx, y + h - 2, 7, 4, '#c3c9d2')  # USB-C e micro-HDMI
    else:  # zero
        c.rect(x + 24, y + 10, 10, 10, '#1d2027')
        for hx in (x + 6, x + 44, x + 52):
            c.rect(hx, y + h - 2, 6, 4, '#c3c9d2')
    c.p(x + 4, y + h - 6, '#ff6b6b')  # LED
    return c


# ---------------------------------------------------------------- fase 2, missão 4: o Marcos cochila jogando forca

def f_tablet_floor():
    """Tablet caído no chão, de tela para cima, com a forca aberta na tela: 16 x 11."""
    c = Canvas(16, 11)
    c.rect(0, 0, 16, 11, OUT)
    c.rect(1, 1, 14, 9, '#2b2f37')
    c.rect(2, 2, 12, 7, '#4f86c6')  # tela azul da forca
    c.vline(4, 3, 5, '#ffffff')     # forca
    c.hline(4, 3, 4, '#ffffff')
    c.p(7, 4, '#ffffff')
    for x in (9, 11, 13):           # tracinhos das letras
        c.p(x - 0, 7, '#ffffff')
    c.p(10, 4, '#ffd166')
    c.p(12, 4, '#ffd166')
    return c


def f_zzz():
    """Balão de quem está dormindo, com "zZ": 16 x 12."""
    c = Canvas(16, 12)
    c.rect(1, 1, 14, 8, '#ffffff')
    c.rect(3, 9, 2, 1, '#ffffff')
    c.p(3, 10, '#ffffff')
    def z(x, y, n):
        c.hline(x, y, n, '#3b6fb0')
        for i in range(1, n - 1):
            c.p(x + n - 1 - i, y + i, '#3b6fb0')
        c.hline(x, y + n - 1, n, '#3b6fb0')
    z(2, 4, 4)
    z(8, 2, 6)
    return c.outline()


def f_phone_ring():
    """Celular tocando (chegou mensagem), em cima da cabeça do ESTAGIÁRIO: 16 x 14, com as ondinhas de vibração."""
    c = Canvas(16, 14)
    c.rect(5, 1, 6, 12, '#2b2f37')
    c.rect(6, 2, 4, 9, '#7ee08a')
    c.rect(6, 3, 3, 2, '#ffffff')
    c.hline(7, 6, 3, '#ffffff')
    c.p(8, 12, '#8a8f99')
    for x0, sgn in ((3, -1), (12, 1)):
        c.vline(x0, 4, 5, '#ffd166')
        c.vline(x0 + 2 * sgn, 3, 7, '#ffd166')
    return c.outline()


def f_note(kind):
    """Nota musical saindo do tablet: 'a' (colcheia) ou 'b' (duas ligadas). 9 x 10."""
    c = Canvas(9, 10)
    col = '#ffd166' if kind == 'a' else '#7ee08a'
    if kind == 'a':
        c.rect(1, 6, 3, 3, col)
        c.vline(3, 0, 7, col)
        c.p(4, 1, col)
        c.p(5, 2, col)
    else:
        c.rect(0, 6, 3, 3, col)
        c.rect(5, 5, 3, 3, col)
        c.vline(2, 1, 6, col)
        c.vline(7, 0, 6, col)
        c.hline(2, 1, 6, col)
        c.hline(2, 2, 6, col)
    return c.outline()


# ---------------------------------------------------------------- fase 3, missão 1: peças de hardware

PCB, PCB_L, PCB_D = '#2f7a4a', '#46995f', '#22583a'
CHIP = '#1d2027'
METAL, METAL_L, METAL_D = '#b9c0c9', '#dfe4ea', '#8a929c'
DARK, DARK_L = '#2b2f37', '#454b57'
LABEL = '#f7f4ea'

# etiqueta (adesivo) de cada desenho grande: x, y, w, h em pixels de arte (o React escreve o texto em cima)
LABELS = {}


def disc(c, cx, cy, r, color):
    for y in range(cy - r, cy + r + 1):
        for x in range(cx - r, cx + r + 1):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r + r * 0.6:
                c.p(x, y, color)


def label(c, name, x, y, w, h):
    c.rect(x, y, w, h, LABEL)
    c.hline(x, y + h - 1, w, '#d8d2c0')
    LABELS[name] = [x, y, w, h]


def screws(c, x, y, w, h, col=METAL_D):
    for sx, sy in ((x + 2, y + 2), (x + w - 3, y + 2), (x + 2, y + h - 3), (x + w - 3, y + h - 3)):
        c.p(sx, sy, col)


def big_hd(kind):
    """HD visto de cima: 3,5" (desktop) ou 2,5" (notebook)."""
    c = Canvas(80, 56)
    name = 'hd-35' if kind == '35' else 'hd-25'
    x, y, w, h = (8, 4, 64, 46) if kind == '35' else (16, 10, 48, 36)
    c.rect(x, y, w, h, METAL)
    c.hline(x, y, w, METAL_L)
    c.vline(x, y, h, METAL_L)
    c.hline(x, y + h - 1, w, METAL_D)
    screws(c, x, y, w, h)
    # tampa com o "rebaixo" do motor
    disc(c, x + w - 14, y + 13, 6 if kind == '35' else 5, METAL_D)
    disc(c, x + w - 14, y + 13, 4 if kind == '35' else 3, METAL)
    # conectores SATA na borda de baixo
    c.rect(x + 6, y + h, 10, 3, CHIP)
    c.rect(x + 18, y + h, 6, 3, CHIP)
    if kind == '35':
        label(c, name, x + 6, y + 18, 40, 22)
    else:
        label(c, name, x + 5, y + 16, 34, 16)
    return c.outline()


def big_ssd(kind):
    """SSD: 2,5" SATA (caixinha) ou M.2 (pente)."""
    c = Canvas(80, 56)
    if kind == 'sata':
        x, y, w, h = 16, 10, 48, 36
        c.rect(x, y, w, h, DARK)
        c.hline(x, y, w, DARK_L)
        c.vline(x, y, h, DARK_L)
        screws(c, x, y, w, h, '#5a616d')
        c.rect(x + 6, y + h, 10, 3, CHIP)
        c.rect(x + 18, y + h, 6, 3, CHIP)
        c.rect(x + 3, y + 4, w - 6, 3, '#e05a3a')  # faixa colorida
        label(c, 'ssd-sata', x + 5, y + 11, 38, 19)
        return c.outline()
    x, y, w, h = 4, 18, 72, 20
    c.rect(x, y, w, h, PCB)
    c.hline(x, y, w, PCB_L)
    c.hline(x, y + h - 1, w, PCB_D)
    # contatos dourados com o chanfro (encaixe) na ponta esquerda
    c.rect(x - 3, y + 2, 4, h - 4, GOLD)
    c.rect(x - 3, y + 6, 4, 2, (0, 0, 0, 0))
    # meia-lua do parafuso na outra ponta
    c.rect(x + w - 3, y + h // 2 - 2, 3, 4, (0, 0, 0, 0))
    c.rect(x + 6, y + 4, 10, 12, CHIP)  # controlador
    label(c, 'ssd-m2', x + 20, y + 3, 42, 14)
    return c.outline()


def big_motherboard():
    """Placa-mãe micro-ATX: soquete, slots de memória, PCI Express, conectores."""
    c = Canvas(80, 56)
    x, y, w, h = 14, 1, 52, 54
    c.rect(x, y, w, h, '#25603f')
    c.hline(x, y, w, '#357a52')
    screws(c, x, y, w, h, '#c9b16a')
    c.rect(x + 1, y + 2, 8, 20, METAL_D)  # conectores traseiros
    c.rect(x + 2, y + 4, 6, 3, CHIP)
    c.rect(x + 2, y + 10, 6, 3, '#3a6fd8')
    c.rect(x + 13, y + 6, 16, 16, METAL)  # soquete do processador
    c.rect(x + 15, y + 8, 12, 12, '#d9d0b0')
    for k in range(0, 12, 2):
        for j in range(0, 12, 2):
            c.p(x + 15 + k, y + 8 + j, '#b7a777')
    for k in range(2):  # slots de memória
        c.rect(x + 34 + k * 5, y + 3, 3, 26, CHIP)
        c.p(x + 35 + k * 5, y + 3, '#e8e8e8')
        c.p(x + 35 + k * 5, y + 28, '#e8e8e8')
    c.rect(x + 46, y + 4, 4, 10, CHIP)  # conector de energia 24 pinos
    c.rect(x + 4, y + 30, 40, 3, CHIP)  # PCI Express x16
    c.hline(x + 4, y + 31, 40, '#5a616d')
    c.rect(x + 30, y + 36, 8, 8, CHIP)  # chipset
    label(c, 'mb-matx', x + 3, y + 37, 26, 15)
    return c.outline()


def big_ram(kind):
    """Pente de memória: DDR4, DDR3 (o chanfro muda de lugar) ou SODIMM (notebook)."""
    c = Canvas(80, 56)
    if kind == 'sodimm':
        x, y, w, h, notch = 18, 14, 44, 26, 15
    else:
        x, y, w, h = 2, 16, 76, 22
        notch = 40 if kind == 'ddr4' else 30
    pcb = PCB if kind != 'ddr3' else '#2d6a8a'
    c.rect(x, y, w, h, pcb)
    c.hline(x, y, w, PCB_L if kind != 'ddr3' else '#4a8db0')
    for k in range(w // 9):  # chips de memória
        c.rect(x + 2 + k * 9, y + 3, 7, 10, CHIP)
    c.rect(x + 1, y + h - 5, w - 2, 4, GOLD)  # contatos
    for k in range(x + 2, x + w - 2, 2):
        c.p(k, y + h - 4, '#b8912e')
    c.rect(x + notch, y + h - 5, 2, 5, (0, 0, 0, 0))  # chanfro
    c.rect(x - 1, y + 8, 2, 4, (0, 0, 0, 0))  # entalhes das travas
    c.rect(x + w - 1, y + 8, 2, 4, (0, 0, 0, 0))
    if kind == 'sodimm':
        label(c, 'ram-sodimm', x + 4, y + 2, 36, 15)
    else:
        label(c, f'ram-{kind}', x + 14, y + 2, 46, 14)
    return c.outline()


def big_cpu(kind):
    """Processador visto de cima: AM4 (pinos embaixo, aparecem na borda) ou LGA (entalhes nos lados, sem pinos)."""
    c = Canvas(80, 56)
    x, y, s = 18, 6, 44
    c.rect(x, y, s, s, '#2f7a4a' if kind == 'am4' else '#3b5f8f')
    if kind == 'lga':
        c.rect(x - 1, y + 10, 3, 5, (0, 0, 0, 0))
        c.rect(x + s - 2, y + 10, 3, 5, (0, 0, 0, 0))
    else:
        for k in range(x + 2, x + s - 2, 2):  # pontas dos pinos aparecendo embaixo
            c.p(k, y + s, GOLD)
            c.p(k, y + s + 1, GOLD)
    c.rect(x + 4, y + 4, s - 8, s - 8, METAL)  # tampa metálica
    c.hline(x + 4, y + 4, s - 8, METAL_L)
    c.vline(x + 4, y + 4, s - 8, METAL_L)
    c.hline(x + 4, y + s - 5, s - 8, METAL_D)
    for k in range(4):  # triângulo dourado do canto (posição do pino 1)
        c.hline(x + 1, y + s - 2 - k, 4 - k, GOLD)
    label(c, f'cpu-{kind}', x + 7, y + 11, s - 14, 18)
    return c.outline()


def big_cooler():
    """Cooler de processador: dissipador de alumínio com a ventoinha na frente."""
    c = Canvas(80, 56)
    x, y, w, h = 6, 6, 68, 44
    for k in range(x, x + w, 3):  # aletas
        c.rect(k, y, 2, h, METAL)
        c.p(k, y, METAL_L)
    c.rect(x + 2, y + h, 6, 3, '#c97b3a')  # tubos de cobre
    c.rect(x + w - 8, y + h, 6, 3, '#c97b3a')
    fx, fy, r = x + 21, y + 22, 20
    c.rect(fx - r, fy - r, 2 * r, 2 * r, DARK)  # moldura da ventoinha
    disc(c, fx, fy, r - 2, '#1a1d23')
    for a in range(0, 360, 60):  # pás
        for t in range(4, r - 3):
            px = fx + int(round(math.cos(math.radians(a + t * 3)) * t))
            py = fy + int(round(math.sin(math.radians(a + t * 3)) * t))
            c.p(px, py, '#5a616d')
            c.p(px + 1, py, '#5a616d')
    disc(c, fx, fy, 4, DARK_L)
    label(c, 'cooler', x + 44, y + 12, 24, 20)
    return c.outline()


def big_psu():
    """Fonte ATX: caixa com a grade da ventoinha e o maço de cabos."""
    c = Canvas(80, 56)
    x, y, w, h = 4, 6, 60, 44
    c.rect(x, y, w, h, DARK)
    c.hline(x, y, w, DARK_L)
    c.vline(x, y, h, DARK_L)
    screws(c, x, y, w, h, '#5a616d')
    fx, fy, r = x + 16, y + 22, 13
    disc(c, fx, fy, r, '#1a1d23')
    for k in range(-r + 2, r - 1, 3):  # grade
        c.hline(fx - r + 2, fy + k, 2 * r - 3, '#5a616d')
    c.rect(x + w, y + 14, 10, 4, CHIP)  # cabos
    c.rect(x + w, y + 20, 12, 4, '#e0b84a')
    c.rect(x + w, y + 26, 9, 4, '#d9534f')
    c.rect(x + w, y + 32, 11, 3, CHIP)
    label(c, 'fonte', x + 32, y + 8, 26, 30)
    return c.outline()


def big_gpu(fans):
    """Placa de vídeo: carcaça com 1 ou 2 ventoinhas, chapinha de metal e contatos PCI Express."""
    c = Canvas(80, 56)
    w = 74 if fans == 2 else 60
    x, y, h = 4, 10, 30
    c.rect(x, y - 2, 3, h + 8, METAL)  # chapinha (saídas de vídeo)
    c.rect(x, y + 4, 2, 4, CHIP)
    c.rect(x, y + 12, 2, 4, CHIP)
    c.rect(x + 3, y, w - 3, h, DARK)
    c.hline(x + 3, y, w - 3, DARK_L)
    c.rect(x + 3, y + h, w - 3, 4, PCB)  # placa por baixo da carcaça
    c.rect(x + 12, y + h + 2, 30 if fans == 2 else 24, 4, GOLD)  # contatos
    c.rect(x + 20, y + h + 2, 2, 4, (0, 0, 0, 0))
    for k in range(fans):
        cx = x + 13 + k * 19
        disc(c, cx, y + 15, 9, '#1a1d23')
        for a in range(0, 360, 72):
            for t in range(3, 8):
                c.p(cx + int(round(math.cos(math.radians(a + t * 8)) * t)), y + 15 + int(round(math.sin(math.radians(a + t * 8)) * t)), '#5a616d')
        disc(c, cx, y + 15, 2, DARK_L)
    lx = x + 13 + (fans - 1) * 19 + 12
    label(c, f'gpu-{fans}', lx, y + 4, x + w - lx - 3, 20)
    return c.outline()


def f_part_floor(kind):
    """Peça caída no chão (vista de cima, pequena) para cada tipo."""
    if kind == 'hd':
        c = Canvas(11, 8)
        c.rect(0, 0, 11, 8, METAL)
        c.rect(2, 2, 5, 4, LABEL)
        c.p(9, 2, METAL_D)
    elif kind == 'ssd':
        c = Canvas(12, 5)
        c.rect(1, 0, 11, 5, PCB)
        c.rect(0, 1, 1, 3, GOLD)
        c.rect(3, 1, 3, 3, CHIP)
        c.rect(7, 1, 4, 3, LABEL)
    elif kind == 'placa-mae':
        c = Canvas(12, 12)
        c.rect(0, 0, 12, 12, '#25603f')
        c.rect(3, 2, 4, 4, METAL)
        c.vline(9, 1, 6, CHIP)
        c.hline(1, 8, 9, CHIP)
    elif kind == 'ram':
        c = Canvas(14, 5)
        c.rect(0, 0, 14, 5, PCB)
        for k in range(4):
            c.rect(1 + k * 3, 1, 2, 2, CHIP)
        c.hline(0, 4, 14, GOLD)
    elif kind == 'processador':
        c = Canvas(8, 8)
        c.rect(0, 0, 8, 8, '#2f7a4a')
        c.rect(1, 1, 6, 6, METAL)
        c.p(0, 7, GOLD)
    elif kind == 'cooler':
        c = Canvas(11, 11)
        c.rect(0, 0, 11, 11, METAL)
        disc(c, 5, 5, 4, '#1a1d23')
        c.p(5, 5, DARK_L)
    elif kind == 'fonte':
        c = Canvas(12, 9)
        c.rect(0, 0, 12, 9, DARK)
        disc(c, 4, 4, 3, '#1a1d23')
        c.rect(8, 2, 3, 5, LABEL)
    else:  # placa de vídeo
        c = Canvas(14, 7)
        c.rect(0, 0, 14, 6, DARK)
        disc(c, 4, 3, 2, '#1a1d23')
        disc(c, 9, 3, 2, '#1a1d23')
        c.hline(3, 6, 8, GOLD)
    return c.outline()


PART_KINDS = ('hd', 'ssd', 'placa-mae', 'ram', 'processador', 'cooler', 'fonte', 'placa-video')


def make_pecas():
    out = os.path.join(ASSETS, 'pecas')
    os.makedirs(out, exist_ok=True)
    imgs = {
        'hd-35': big_hd('35'), 'hd-25': big_hd('25'), 'ssd-sata': big_ssd('sata'), 'ssd-m2': big_ssd('m2'),
        'mb-matx': big_motherboard(), 'ram-ddr4': big_ram('ddr4'), 'ram-ddr3': big_ram('ddr3'),
        'ram-sodimm': big_ram('sodimm'), 'cpu-am4': big_cpu('am4'), 'cpu-lga': big_cpu('lga'), 'cooler': big_cooler(),
        'fonte': big_psu(), 'gpu-2': big_gpu(2), 'gpu-1': big_gpu(1),
    }
    for name, cv in imgs.items():
        cv.im.resize((cv.w * BIG, cv.h * BIG), Image.NEAREST).save(os.path.join(out, f'{name}.png'), optimize=True)
    with open(os.path.join(out, 'etiquetas.json'), 'w') as f:
        json.dump({'w': 80, 'h': 56, 'labels': LABELS}, f, indent=1)



def make_placas():
    out = os.path.join(ASSETS, 'placas')
    os.makedirs(out, exist_ok=True)
    imgs = {
        'arduino-uno': big_arduino('uno'), 'arduino-nano': big_arduino('nano'), 'arduino-mega': big_arduino('mega'),
        'raspberry-pi-4': big_raspberry('pi4'), 'raspberry-pi-zero': big_raspberry('zero'),
        'raspberry-pi-pico': big_raspberry('pico'),
    }
    for name, cv in imgs.items():
        cv.im.resize((cv.w * BIG, cv.h * BIG), Image.NEAREST).save(os.path.join(out, f'{name}.png'), optimize=True)

# ---------------------------------------------------------------- fase 3, missão 3: a bancada de montagem
# Tudo em "camadas" do tamanho da bancada (200 x 120 pixels de arte, salvas ampliadas 4x): o React empilha a mesa, o
# gabinete e cada peça encaixada. As áreas de encaixe e as portas dos cabos vão para montar/bancada.json.

BW, BH = 200, 120
MONTAR = {
    'slots': {
        'gabinete': [14, 4, 118, 88],
        'placa-mae': [22, 10, 62, 62],
        'processador': [42, 24, 14, 14],
        'cooler': [39, 21, 20, 20],
        'ram-0': [63, 13, 4, 32],
        'ram-1': [69, 13, 4, 32],
        'placa-video': [24, 49, 58, 11],
        'fonte': [20, 74, 44, 16],
        'hd': [94, 50, 22, 12],
        'ssd': [96, 70, 18, 8],
    },
    'ports': {
        'psu-24': [68, 76], 'psu-sata-0': [68, 80], 'psu-sata-1': [68, 84], 'psu-pcie': [68, 88],
        'mb-24': [80, 24], 'mb-sata-0': [80, 60], 'mb-sata-1': [80, 66],
        'hd-power': [95, 53], 'hd-data': [95, 59],
        'ssd-power': [97, 72], 'ssd-data': [97, 76],
        'gpu-power': [76, 51],
    },
    'power': [121, 8, 8, 7],
    'screen': [145, 35, 46, 31],
}


def layer():
    return Canvas(BW, BH)


def bench_bg():
    """A mesa da Sala de TI com o monitor desligado (o gabinete entra por cima)."""
    c = layer()
    for y in range(0, 84):  # parede
        for x in range(BW):
            c.p(x, y, '#e9dfc9' if (x // 8 + y // 8) % 2 or noise(x, y, 7) > 0.08 else '#e2d6bd')
    c.hline(0, 83, BW, '#cbbd9f')
    c.rect(0, 84, BW, 12, '#b9824a')  # tampo
    for x in range(0, BW, 13):
        c.hline(x, 86 + (x // 13) % 3 * 3, 7, '#a8733f')
    c.hline(0, 84, BW, '#d29a5c')
    c.rect(0, 96, BW, 8, '#8a5a2e')  # borda da frente
    c.hline(0, 103, BW, '#6b4422')
    c.rect(0, 104, BW, 16, '#5b6270')  # chão
    c.rect(6, 104, 8, 16, '#6b4422')  # pernas
    c.rect(BW - 14, 104, 8, 16, '#6b4422')
    # monitor
    c.rect(140, 30, 56, 41, '#23262d')
    c.hline(140, 30, 56, '#3a3f49')
    c.rect(145, 35, 46, 31, '#0d0f13')
    c.p(193, 68, '#3a3f49')
    c.rect(164, 71, 8, 9, '#2b2f37')
    c.rect(154, 80, 28, 5, '#23262d')
    c.hline(154, 80, 28, '#3a3f49')
    # teclado e mouse
    c.rect(141, 89, 36, 5, '#2b2f37')
    for k in range(143, 175, 3):
        c.hline(k, 90, 2, '#4a505c')
        c.hline(k + 1, 92, 2, '#4a505c')
    c.rect(182, 89, 6, 5, '#2b2f37')
    c.p(184, 89, '#4a505c')
    return c


def case_layer(gamer):
    """Gabinete deitado de lado, sem a tampa: a chapa do fundo, a baia dos discos e o botão de ligar."""
    c = layer()
    x, y, w, h = MONTAR['slots']['gabinete']
    frame, frame_l, plate = ('#2b2e36', '#40444f', '#1d2026') if gamer else ('#c3c9d1', '#dfe4ea', '#6b7380')
    c.rect(x, y, w, h, frame)
    c.hline(x, y, w, frame_l)
    c.rect(x + 3, y + 3, w - 18, h - 6, plate)  # chapa do fundo
    for yy in range(y + 6, y + h - 6, 6):  # furinhos de ventilação na chapa
        for xx in range(x + 6, x + w - 20, 6):
            c.p(xx, yy, '#5a616d' if not gamer else '#2a2e36')
    c.rect(x + 3, y + 8, 4, 26, '#4a505c' if not gamer else '#14161a')  # recorte traseiro (conectores)
    # frente (lado direito): baias dos discos e o painel
    c.rect(x + w - 15, y, 15, h, frame_l if not gamer else '#22252c')
    c.rect(92, 46, 26, 44, '#8a929c' if not gamer else '#30343d')  # gaiola dos discos
    c.rect(93, 48, 24, 16, '#5f6775' if not gamer else '#1d2026')  # baia de 3,5"
    c.rect(95, 68, 20, 12, '#5f6775' if not gamer else '#1d2026')  # baia de 2,5"
    for yy in (52, 58, 72):
        c.p(116, yy, METAL_L)
    px, py, pw, ph = MONTAR['power']
    c.rect(px, py, pw, ph, '#1a1d23')  # botão de ligar
    disc(c, px + 4, py + 3, 2, '#5a616d')
    c.p(px + 4, py + 1, '#cfd5dd')
    c.rect(x + w - 10, y + 20, 4, 1, '#1a1d23')  # led
    if gamer:  # fita de LED na frente e duas ventoinhas com anel colorido
        for k in range(h - 8):
            c.p(x + w - 2, y + 4 + k, ('#a855f7', '#22d3ee', '#ec4899')[(k // 10) % 3])
        for fy in (y + 30, y + 52):
            disc(c, x + w - 8, fy, 5, '#22d3ee')
            disc(c, x + w - 8, fy, 4, '#111318')
            c.p(x + w - 8, fy, '#5a616d')
    return c.outline()


def mobo_layer():
    c = layer()
    x, y, w, h = MONTAR['slots']['placa-mae']
    c.rect(x, y, w, h, '#25603f')
    c.hline(x, y, w, '#357a52')
    screws(c, x, y, w, h, '#c9b16a')
    c.rect(x + 1, y + 2, 6, 22, METAL_D)  # conectores traseiros
    c.rect(x + 2, y + 4, 4, 3, CHIP)
    c.rect(x + 2, y + 10, 4, 3, '#3a6fd8')
    c.rect(x + 2, y + 16, 4, 3, CHIP)
    sx, sy, sw, sh = MONTAR['slots']['processador']
    c.rect(sx - 1, sy - 1, sw + 2, sh + 2, METAL)  # soquete
    c.rect(sx + 1, sy + 1, sw - 2, sh - 2, '#d9d0b0')
    for k in range(0, sw - 2, 2):
        for j in range(0, sh - 2, 2):
            c.p(sx + 1 + k, sy + 1 + j, '#b7a777')
    for slot in ('ram-0', 'ram-1'):  # slots de memória
        rx, ry, rw, rh = MONTAR['slots'][slot]
        c.rect(rx + 1, ry + 1, 2, rh - 2, CHIP)
        c.p(rx + 1, ry, '#e8e8e8')
        c.p(rx + 1, ry + rh - 1, '#e8e8e8')
    c.rect(78, 18, 4, 12, CHIP)  # entrada de energia de 24 pinos
    for k in range(19, 29, 2):
        c.p(79, k, '#5a616d')
    c.rect(26, 52, 40, 3, CHIP)  # slot PCI Express x16
    c.hline(26, 53, 40, '#5a616d')
    c.rect(52, 40, 8, 8, CHIP)  # chipset
    c.rect(77, 58, 5, 4, CHIP)  # portas SATA
    c.rect(77, 64, 5, 4, CHIP)
    c.p(78, 59, '#e0413a')
    c.p(78, 65, '#e0413a')
    c.rect(x + 3, y + h - 8, 18, 5, LABEL)  # adesivo
    return c.outline()


def cpu_layer():
    c = layer()
    x, y, w, h = MONTAR['slots']['processador']
    c.rect(x, y, w, h, '#3b5f8f')
    c.rect(x + 2, y + 2, w - 4, h - 4, METAL)
    c.hline(x + 2, y + 2, w - 4, METAL_L)
    c.vline(x + 2, y + 2, h - 4, METAL_L)
    for k in range(3):
        c.hline(x + 1, y + h - 2 - k, 3 - k, GOLD)
    return c.outline()


def cooler_layer():
    c = layer()
    x, y, w, h = MONTAR['slots']['cooler']
    c.rect(x, y, w, h, METAL)
    for k in range(x, x + w, 2):
        c.vline(k, y, h, METAL_D)
    c.rect(x + 1, y + 1, w - 2, h - 2, DARK)
    cx, cy, r = x + w // 2, y + h // 2, w // 2 - 2
    disc(c, cx, cy, r, '#1a1d23')
    for a in range(0, 360, 60):
        for t in range(2, r):
            c.p(cx + int(round(math.cos(math.radians(a + t * 9)) * t)), cy + int(round(math.sin(math.radians(a + t * 9)) * t)), '#5a616d')
    disc(c, cx, cy, 2, DARK_L)
    return c.outline()


def ram_layer(slot, gamer):
    c = layer()
    x, y, w, h = MONTAR['slots'][slot]
    if gamer:  # dissipador com o topo colorido
        c.rect(x, y, w, h, '#2b2f37')
        c.rect(x, y, w, 3, '#a855f7')
        for k in range(y + 5, y + h - 2, 4):
            c.hline(x, k, w, '#454b57')
    else:
        c.rect(x, y, w, h, PCB)
        for k in range(y + 2, y + h - 2, 5):
            c.rect(x + 1, k, w - 2, 3, CHIP)
    c.p(x, y + h - 1, GOLD)
    c.p(x + w - 1, y + h - 1, GOLD)
    return c.outline()


def gpu_layer():
    c = layer()
    x, y, w, h = MONTAR['slots']['placa-video']
    c.rect(x - 2, y - 3, 2, h + 6, METAL)  # chapinha
    c.rect(x, y, w, h - 3, DARK)
    c.hline(x, y, w, DARK_L)
    c.rect(x, y + h - 3, w, 3, PCB)
    c.rect(x + 10, y + 2, w - 26, 2, '#22d3ee')  # faixa de LED
    c.rect(x + w - 8, y - 1, 6, 3, CHIP)  # entrada de energia
    c.rect(x + 3, y + 3, 6, 3, LABEL)
    return c.outline()


def psu_layer():
    c = layer()
    x, y, w, h = MONTAR['slots']['fonte']
    c.rect(x, y, w, h, DARK)
    c.hline(x, y, w, DARK_L)
    for k in range(x + 2, x + 16, 2):  # grade da ventoinha (de lado)
        c.vline(k, y + 2, h - 4, '#1a1d23')
    c.rect(x + 20, y + 3, 16, 9, LABEL)
    c.hline(x + 22, y + 6, 10, '#9aa1ab')
    c.hline(x + 22, y + 8, 8, '#9aa1ab')
    c.rect(x + w, y + 1, 2, h - 2, CHIP)  # saída do maço de cabos
    return c.outline()


def drive_layer(kind):
    c = layer()
    x, y, w, h = MONTAR['slots'][kind]
    if kind == 'hd':
        c.rect(x, y, w, h, METAL)
        c.hline(x, y, w, METAL_L)
        c.rect(x + 8, y + 3, 11, 6, LABEL)
        screws(c, x, y, w, h)
    else:
        c.rect(x, y, w, h, DARK)
        c.hline(x, y, w, DARK_L)
        c.rect(x + 6, y + 2, 10, 4, '#e05a3a')
    c.rect(x - 1, y + 1, 2, h - 2, CHIP)  # conectores (energia e dados) do lado de dentro
    return c.outline()


def boot_layer():
    """Tela de inicialização (marca inventada): um logo e os pontinhos girando."""
    c = layer()
    x, y, w, h = MONTAR['screen']
    c.rect(x, y, w, h, '#13243f')
    cx, cy = x + w // 2, y + 12
    c.rect(cx - 7, cy - 7, 14, 14, '#22d3ee')
    c.rect(cx - 6, cy - 8, 12, 1, '#22d3ee')
    c.rect(cx - 6, cy + 7, 12, 1, '#22d3ee')
    for k in range(6):  # triângulo de "play"
        c.vline(cx - 3 + k, cy - 5 + k, 11 - 2 * k, '#ffffff')
    for k, col in enumerate(('#ffffff', '#9fb3d1', '#5f7aa3', '#3a5480')):
        c.rect(cx - 8 + k * 4, y + h - 8, 2, 2, col)
    return c


def led_layer():
    c = layer()
    x, y, w, h = MONTAR['slots']['gabinete']
    c.rect(x + w - 10, y + 20, 4, 1, '#4ade80')
    return c


def icon_case(gamer):
    """Gabinete na mochila: torre vista de frente, de lado."""
    c = Canvas(80, 56)
    x, y, w, h = 24, 2, 30, 52
    side = '#2b2e36' if gamer else '#c3c9d1'
    front = '#1d2026' if gamer else '#dfe4ea'
    c.rect(x + 8, y, w, h, side)  # lateral
    if gamer:
        c.rect(x + 11, y + 4, w - 6, h - 8, '#3b3f4b')  # vidro
        c.rect(x + 13, y + 6, w - 10, h - 12, '#262a33')
        c.hline(x + 13, y + 6, w - 10, '#a855f7')
    c.rect(x, y + 2, 9, h - 2, front)  # frente
    c.rect(x + 2, y + 6, 5, 2, '#1a1d23')
    disc(c, x + 4, y + 12, 1, '#4ade80' if gamer else '#5a616d')
    if gamer:
        for k in range(h - 8):
            c.p(x + 8, y + 5 + k, ('#a855f7', '#22d3ee', '#ec4899')[(k // 8) % 3])
    else:
        for k in range(y + 18, y + h - 6, 3):
            c.hline(x + 2, k, 5, '#9aa1ab')
    return c.outline()


def make_montar():
    out = os.path.join(ASSETS, 'montar')
    os.makedirs(out, exist_ok=True)
    layers = {
        'bancada': bench_bg(), 'gabinete': case_layer(False), 'gabinete-gamer': case_layer(True),
        'placa-mae': mobo_layer(), 'processador': cpu_layer(), 'cooler': cooler_layer(),
        'ram-0': ram_layer('ram-0', False), 'ram-1': ram_layer('ram-1', False),
        'ram-0-gamer': ram_layer('ram-0', True), 'ram-1-gamer': ram_layer('ram-1', True),
        'placa-video': gpu_layer(), 'fonte': psu_layer(), 'hd': drive_layer('hd'), 'ssd': drive_layer('ssd'),
        'tela-boot': boot_layer(), 'led': led_layer(),
        'gabinete-icone': icon_case(False), 'gabinete-gamer-icone': icon_case(True),
    }
    for name, cv in layers.items():
        cv.im.resize((cv.w * BIG, cv.h * BIG), Image.NEAREST).save(os.path.join(out, f'{name}.png'), optimize=True)
    with open(os.path.join(out, 'bancada.json'), 'w') as f:
        json.dump({'w': BW, 'h': BH, **MONTAR}, f, indent=1)



# ---------------------------------------------------------------- fase 4, missão 1: projetor e webcam na Sala de Reuniões
# Camadas do tamanho da cena (200 x 130 pixels de arte, salvas ampliadas 4x): a parede com a tela de projeção e a
# tomada, a mesa de reunião com o notebook (tela virada para o ESTAGIÁRIO) e, por cima, o projetor, a webcam e os
# rolos dos cabos. As áreas de encaixe, as entradas e as pontas dos cabos vão para projetor/cena.json.

PW, PH = 200, 130
PROJETOR = {
    'slots': {'projetor': [116, 74, 46, 26], 'webcam': [42, 43, 14, 8]},
    'table': [0, 70, 200, 56],
    'ports': {
        'nb-usb': [17, 93], 'nb-hdmi': [81, 90], 'nb-vga': [82, 95],
        'pj-vga': [127, 91], 'pj-hdmi': [136, 91], 'pj-power': [153, 91],
        'tomada': [183, 61],
    },
    'plugs': {
        'vga-a': [90, 114], 'vga-b': [110, 114],
        'forca-plugue': [163, 115], 'forca-conector': [181, 115],
        'webcam-usb': [8, 108],
    },
    # de onde sai o cabo de cada coisa (meio do rolo do cabo, ou o corpo da webcam)
    'anchors': {'vga': [100, 109], 'forca': [172, 110], 'webcam': [49, 47]},
    'screen': [25, 53, 48, 30],
    'wall': [64, 8, 72, 45],
    'lens': [139, 76],
    'power': [69, 88, 5, 2],
}


def proj_layer():
    return Canvas(PW, PH)


def proj_room():
    """Parede da Sala de Reuniões com a tela de projeção e a tomada; a mesa com o notebook aberto, tela desligada."""
    c = proj_layer()
    for y in range(0, 66):  # parede
        for x in range(PW):
            c.p(x, y, '#d9c7a6' if noise(x, y, 6) > 0.15 else '#d1be9b')
    c.rect(0, 66, PW, 4, '#8a5a34')  # rodapé
    c.hline(0, 66, PW, '#a8714a')
    # tela de projeção (de enrolar): caixa em cima e o tecido branco
    c.rect(56, 2, 88, 4, '#5f6775')
    c.hline(56, 2, 88, '#8c95a3')
    c.rect(59, 6, 82, 52, '#f4f5f7')
    c.rect(59, 6, 82, 1, '#c9ced6')
    c.vline(140, 6, 52, '#d5d9e0')
    c.rect(59, 57, 82, 2, '#2b2f37')  # barra de baixo
    c.rect(98, 59, 4, 3, '#2b2f37')  # puxador
    # tomada na parede
    c.rect(178, 56, 11, 10, '#f4f5f7')
    c.hline(178, 65, 11, '#c9ced6')
    c.rect(181, 59, 5, 5, '#e1e4e9')
    c.p(182, 61, '#2b2f37')
    c.p(184, 61, '#2b2f37')
    c.p(183, 62, '#2b2f37')
    # mesa de reunião (tampo visto de cima, na frente)
    for y in range(70, 118):
        for x in range(PW):
            c.p(x, y, WOOD if noise(x // 3, y, 11) > 0.2 else '#9c6236')
    for x in range(0, PW, 17):
        c.hline(x, 74 + (x // 17) % 5 * 9, 9, '#9c6236')
    c.hline(0, 70, PW, WOOD_L)
    c.rect(0, 118, PW, 8, WOOD_D)
    c.hline(0, 125, PW, WOOD_DD)
    c.rect(0, 126, PW, 4, '#2a646c')  # carpete
    # notebook aberto, com a tela virada para cá
    c.rect(22, 50, 54, 36, '#2b2f37')
    c.hline(22, 50, 54, '#4a505c')
    c.rect(25, 53, 48, 30, '#0d0f13')
    c.p(48, 51, '#4a505c')  # lugar da câmera embutida (quebrada)
    for k in range(12):  # base com o teclado, em perspectiva
        c.hline(20 - k // 4, 86 + k, 58 + k // 2, '#3a3f49' if k else '#4a505c')
    for row in range(3):
        for kx in range(24 + row, 72 - row, 3):
            c.hline(kx, 88 + row * 2, 2, '#23262d')
    c.rect(41, 94, 16, 3, '#2f333c')  # touchpad
    c.hline(16, 97, 64, '#1f2228')
    c.rect(69, 88, 5, 2, '#5f6775')  # botão de ligar
    # entradas nas laterais da base: USB à esquerda; HDMI e VGA à direita
    c.rect(15, 92, 3, 2, '#9aa1ab')
    c.rect(79, 89, 3, 2, '#2b2f37')
    c.p(80, 89, '#e5c34a')
    c.rect(79, 94, 4, 3, '#2f5f9e')
    # celular e papéis esquecidos na mesa
    c.rect(186, 76, 6, 10, '#1d2027')
    c.rect(187, 77, 4, 7, '#3f8fd6')
    c.rect(4, 74, 12, 9, '#f4f1e8')
    c.hline(6, 76, 8, '#c9c3b4')
    c.hline(6, 78, 6, '#c9c3b4')
    return c


def proj_projector():
    """Projetor na mesa, visto por trás: o tampo com o anel de foco e as entradas VGA, HDMI e de energia."""
    c = proj_layer()
    x, y, w, h = PROJETOR['slots']['projetor']
    c.rect(x + 2, y + 2, w - 4, 9, '#e6e9ee')  # tampo
    c.hline(x + 2, y + 2, w - 4, '#ffffff')
    disc(c, x + 23, y + 3, 3, '#4a505c')  # lente (virada para a parede)
    disc(c, x + 23, y + 3, 2, '#2b2f37')
    c.rect(x + 2, y + 11, w - 4, 13, '#c9ced6')  # traseira
    c.hline(x + 2, y + 11, w - 4, '#b4bcc8')
    for vx in range(x + 30, x + 42, 2):  # ventilação
        c.vline(vx, y + 13, 5, '#9aa1ab')
    c.rect(x + 9, y + 15, 6, 4, '#2f5f9e')  # VGA
    c.hline(x + 10, y + 16, 4, '#5f86c8')
    c.rect(x + 18, y + 16, 5, 2, '#2b2f37')  # HDMI
    c.p(x + 20, y + 16, '#e5c34a')
    c.rect(x + 34, y + 15, 6, 5, '#2b2f37')  # energia
    c.rect(x + 35, y + 16, 4, 3, '#4a505c')
    c.rect(x + 4, y + 24, 4, 2, '#4a505c')  # pezinhos
    c.rect(x + w - 8, y + 24, 4, 2, '#4a505c')
    c.rect(x + 4, y + 13, 3, 2, '#5f6775')  # botão (liga junto com o notebook)
    return c.outline()


def proj_webcam():
    """Webcam presa em cima da tela do notebook."""
    c = proj_layer()
    x, y, w, h = PROJETOR['slots']['webcam']
    c.rect(x + 1, y, w - 2, 5, '#1d2027')
    c.hline(x + 1, y, w - 2, '#3a3f49')
    disc(c, x + 7, y + 2, 2, '#3a3f49')
    c.p(x + 7, y + 2, '#3f8fd6')
    c.p(x + 11, y + 1, '#4ade80')
    c.rect(x + 4, y + 5, 6, 3, '#2b2f37')  # presilha
    return c.outline()


def proj_coil(kind):
    """Rolo do cabo em cima da mesa: VGA azul ou de força preto."""
    c = proj_layer()
    cx, cy = PROJETOR['anchors'][kind]
    col, col_l = ('#2f5f9e', '#5f86c8') if kind == 'vga' else ('#23262d', '#4a505c')
    for r in (6, 4):
        for a in range(0, 360, 3):
            c.rect(cx + round(r * 1.6 * math.cos(math.radians(a))), cy + round(r * 0.7 * math.sin(math.radians(a))), 2, 1, col)
    c.hline(cx - 6, cy - 4, 6, col_l)
    return c


def proj_icon(kind):
    """Desenhos da caixa (80 x 56)."""
    c = Canvas(80, 56)
    if kind == 'projetor':
        c.rect(14, 18, 52, 26, '#e6e9ee')
        c.hline(14, 18, 52, '#ffffff')
        c.rect(14, 38, 52, 6, '#c9ced6')
        disc(c, 30, 31, 8, '#4a505c')
        disc(c, 30, 31, 6, '#2b2f37')
        disc(c, 30, 31, 3, '#3f8fd6')
        c.p(28, 29, '#bfe6ff')
        for vx in range(46, 62, 3):
            c.vline(vx, 24, 10, '#9aa1ab')
        c.rect(18, 44, 6, 3, '#4a505c')
        c.rect(56, 44, 6, 3, '#4a505c')
    elif kind == 'webcam':
        c.rect(22, 16, 36, 20, '#1d2027')
        c.hline(22, 16, 36, '#3a3f49')
        disc(c, 40, 26, 7, '#3a3f49')
        disc(c, 40, 26, 4, '#0d0f13')
        disc(c, 40, 26, 2, '#3f8fd6')
        c.p(52, 20, '#4ade80')
        c.rect(34, 36, 12, 8, '#2b2f37')
        c.rect(30, 44, 20, 3, '#2b2f37')
        c.rect(58, 26, 10, 2, '#4a505c')  # cabo
        c.rect(68, 24, 6, 6, '#9aa1ab')  # plugue USB
    else:
        col, col_l = ('#2f5f9e', '#5f86c8') if kind == 'vga' else ('#23262d', '#4a505c')
        for r in (14, 11, 8):
            for a in range(0, 360, 3):
                c.rect(40 + round(r * 1.3 * math.cos(math.radians(a))), 28 + round(r * 0.9 * math.sin(math.radians(a))), 2, 2, col)
        c.hline(26, 16, 10, col_l)
        if kind == 'vga':
            for px_, flip in ((6, False), (62, True)):
                c.rect(px_, 22, 12, 10, '#2f5f9e')
                c.rect(px_ + 2, 24, 8, 6, '#c9ced6')
                for k in range(3):
                    c.hline(px_ + 3, 25 + k * 2, 6, '#5f6775')
        else:
            c.rect(4, 22, 12, 12, '#23262d')  # plugue de tomada
            c.rect(6, 34, 2, 5, '#c9ced6')
            c.rect(12, 34, 2, 5, '#c9ced6')
            c.rect(64, 22, 12, 12, '#23262d')  # conector do projetor
            c.rect(66, 25, 8, 6, '#4a505c')
            for k in range(3):
                c.rect(67 + k * 2, 27, 1, 2, '#c9ced6')
    return c.outline()


def proj_webcam_picture():
    """O que a webcam filma: o ESTAGIÁRIO na Sala de Reuniões, com o quadro branco atrás (32 x 20, salva 8x)."""
    c = Canvas(32, 20)
    for y in range(20):
        for x in range(32):
            c.p(x, y, '#d9c7a6' if noise(x, y, 12) > 0.15 else '#d1be9b')
    c.rect(1, 2, 9, 7, '#f7f8fa')  # quadro branco
    c.hline(2, 4, 5, '#2f5f9e')
    c.hline(2, 6, 4, '#c0392b')
    c.rect(24, 1, 6, 8, '#7fb7c9')  # janela
    c.vline(27, 1, 8, '#5c6b78')
    draw_body_front(c, 11, 14, ESTAGIARIO, 0, 0)
    draw_head(c, 11, 4, ESTAGIARIO, 'down')
    return c


def make_projetor():
    out = os.path.join(ASSETS, 'projetor')
    os.makedirs(out, exist_ok=True)
    layers = {
        'sala': proj_room(), 'projetor': proj_projector(), 'webcam': proj_webcam(),
        'vga': proj_coil('vga'), 'forca': proj_coil('forca'),
        'projetor-icone': proj_icon('projetor'), 'webcam-icone': proj_icon('webcam'),
        'vga-icone': proj_icon('vga'), 'forca-icone': proj_icon('forca'),
    }
    for name, cv in layers.items():
        cv.im.resize((cv.w * BIG, cv.h * BIG), Image.NEAREST).save(os.path.join(out, f'{name}.png'), optimize=True)
    pic = proj_webcam_picture()
    pic.im.resize((pic.w * 8, pic.h * 8), Image.NEAREST).save(os.path.join(out, 'webcam-imagem.png'), optimize=True)
    with open(os.path.join(out, 'cena.json'), 'w') as f:
        json.dump({'w': PW, 'h': PH, **PROJETOR}, f, indent=1)


# ---------------------------------------------------------------- fase 4, missão 2: a impressora da Sala de Impressão
# A traseira da impressora (a Copiadora da sala), vista de trás, com a entrada de rede (LAN), a USB e a de energia (AC).
# Na parede, a tomada de rede e a de energia já têm os cabos ligados; as outras pontas estão no chão. 200 x 120 pixels
# de arte, salvos ampliados 4x; as entradas e as pontas vão para impressora/cena.json.

IW, IH = 200, 120
IMPRESSORA = {
    'ports': {'rede': [96, 55], 'usb': [110, 55], 'energia': [103, 76]},
    'plugs': {'rede': [148, 108], 'energia': [176, 112]},
    # onde o cabo sai da parede e onde ele encosta no chão (o resto é desenhado pelo modal)
    'wall': {'rede': [161, 61], 'energia': [183, 64]},
    'floor': {'rede': [158, 104], 'energia': [190, 108]},
    'led': [121, 39],
}


def imp_back():
    """A parede, o chão e a traseira da impressora, desligada (as pontas dos cabos ficam por conta do modal)."""
    c = Canvas(IW, IH)
    for y in range(0, 78):  # parede
        for x in range(IW):
            c.p(x, y, '#d9c7a6' if noise(x, y, 7) > 0.15 else '#d1be9b')
    c.rect(0, 78, IW, 4, '#8a5a34')  # rodapé
    c.hline(0, 78, IW, '#a8714a')
    for y in range(82, IH):  # carpete
        for x in range(IW):
            c.p(x, y, '#5d6b7a' if noise(x // 2, y, 9) > 0.2 else '#55626f')
    c.rect(28, 100, 100, 4, '#3f4954')  # sombra da impressora no chão
    # impressora vista de trás: tampa do scanner em cima, corpo e a placa das entradas
    c.rect(22, 12, 112, 12, '#c3c8cf')
    c.hline(22, 12, 112, '#e6e9ee')
    c.rect(26, 10, 104, 3, '#b4bcc8')  # tampa
    c.rect(98, 14, 22, 8, '#2b2f37')  # visor (apagado), visto por cima da tampa
    c.rect(20, 24, 116, 76, '#d6dae0')
    c.hline(20, 24, 116, '#eef0f3')
    c.vline(20, 24, 76, '#c3c8cf')
    c.vline(135, 24, 76, '#b4bcc8')
    c.rect(30, 34, 96, 58, '#c9ced6')  # tampa traseira
    c.hline(30, 34, 96, '#b4bcc8')
    for vy in range(40, 86, 4):  # ventilação
        c.hline(36, vy, 30, '#9aa1ab')
    c.rect(38, 88, 18, 3, '#f7f4ea')  # etiqueta
    c.hline(40, 89, 10, '#9aa1ab')
    c.rect(84, 44, 42, 44, '#8c95a3')  # placa das entradas
    c.hline(84, 44, 42, '#b4bcc8')
    c.vline(125, 44, 44, '#5f6775')
    # LAN: rede (RJ45), com os contatos dourados em cima
    c.rect(92, 51, 9, 8, '#1d2027')
    c.rect(93, 52, 7, 2, '#e5c34a')
    for k in range(4):
        c.p(93 + k * 2, 52, '#9c7a1a')
    c.rect(95, 58, 3, 1, '#4a505c')  # entalhe da travinha
    write3(c, 'LAN', 91, 61, '#2b2f37')
    # USB: entrada quadradinha com os cantos de cima chanfrados
    c.rect(107, 51, 7, 7, '#1d2027')
    c.p(107, 51, '#8c95a3')
    c.p(113, 51, '#8c95a3')
    c.rect(109, 53, 3, 3, '#c9ced6')
    write3(c, 'USB', 105, 61, '#2b2f37')
    # AC: entrada de energia de 3 pinos
    c.rect(97, 71, 13, 10, '#1d2027')
    c.p(97, 80, '#8c95a3')
    c.p(109, 80, '#8c95a3')
    for k in range(3):
        c.rect(99 + k * 4, 74, 1, 4, '#c9ced6')
    write3(c, 'AC', 99, 82, '#2b2f37')
    disc(c, IMPRESSORA['led'][0], IMPRESSORA['led'][1], 2, '#4a2620')  # luz de energia, apagada
    c.rect(26, 100, 6, 3, '#4a505c')  # rodinhas
    c.rect(124, 100, 6, 3, '#4a505c')
    # na parede: a tomada de rede (com o cabo azul ligado) e a de energia (com o plugue preto)
    c.rect(155, 50, 12, 11, '#f4f5f7')
    c.hline(155, 60, 12, '#c9ced6')
    c.rect(158, 53, 6, 5, '#2f5f9e')  # capinha do conector
    c.rect(159, 52, 4, 1, '#5f86c8')
    c.rect(176, 52, 14, 12, '#f4f5f7')
    c.hline(176, 63, 14, '#c9ced6')
    c.rect(179, 55, 8, 7, '#23262d')  # plugue na tomada
    c.hline(179, 55, 8, '#4a505c')
    # papéis amassados no chão, de quem tentou imprimir antes
    c.rect(10, 108, 5, 4, '#f4f1e8')
    c.p(12, 109, '#c9c3b4')
    return c


def imp_on():
    """O que muda ao ligar: o visor aceso (PRONTA) e a luz de energia verde."""
    c = Canvas(IW, IH)
    c.rect(98, 14, 22, 8, '#163d2a')
    c.rect(99, 15, 20, 6, '#3fbf7a')
    write3(c, 'ON', 105, 15, '#0d2b1c')
    disc(c, IMPRESSORA['led'][0], IMPRESSORA['led'][1], 2, '#4ade80')
    c.p(IMPRESSORA['led'][0] - 1, IMPRESSORA['led'][1] - 1, '#d9ffe8')
    return c


def make_impressora():
    out = os.path.join(ASSETS, 'impressora')
    os.makedirs(out, exist_ok=True)
    for name, cv in {'traseira': imp_back(), 'ligada': imp_on()}.items():
        cv.im.resize((cv.w * BIG, cv.h * BIG), Image.NEAREST).save(os.path.join(out, f'{name}.png'), optimize=True)
    with open(os.path.join(out, 'cena.json'), 'w') as f:
        json.dump({'w': IW, 'h': IH, **IMPRESSORA}, f, indent=1)


def f_paper_sheet():
    """A folha das frases do treinamento de TI, esquecida em cima da mesa do Marcos."""
    c = Canvas(13, 9)
    c.rect(1, 1, 11, 7, '#fbfaf5')
    c.vline(3, 1, 7, '#e8a2a2')  # margem
    for y in (3, 5, 7):
        c.hline(4, y, 7, '#9db7e0')
    c.rect(9, 0, 2, 3, '#9aa1ab')  # clipe
    return c.outline()


def f_copies():
    """O maço das 10 cópias impressas, em cima da impressora."""
    c = Canvas(14, 8)
    for k in range(3):
        c.rect(1 + k, 4 - k, 11, 3, '#f7f8fa' if k % 2 == 0 else '#e1e4e9')
    c.hline(3, 3, 7, '#9aa1ab')
    c.hline(3, 5, 5, '#9aa1ab')
    return c.outline()


def build():
    os.makedirs(ASSETS, exist_ok=True)
    make_tiles()
    make_estagiario()
    make_colegas()
    make_cursor()
    make_equipamentos()
    make_placas()
    make_pecas()
    make_montar()
    make_projetor()
    make_impressora()

    # tipos de móvel: (canvas, área de colisão em px de arte relativa ao canto do sprite, camada)
    #   camada "wall" = pendurado na parede (sem colisão, fica atrás de tudo)
    #   camada "floor" = no chão sem colisão (tapete)
    types = {}

    def add(name, canvas, foot=None, layer='object'):
        types[name] = {'canvas': canvas, 'foot': foot, 'layer': layer}

    for v in range(3):
        add(f'mesa-pc-{v}', f_desk_pc(v), (1, 9, 48, 21))
    add('mesa-diretor', f_manager_desk(), (1, 9, 58, 23))
    add('mesa-vazia', f_desk_empty(), (1, 9, 48, 21))
    add('mesa-montada-0', f_desk_built(0), (1, 9, 48, 21))
    add('mesa-montada-1', f_desk_built(1), (1, 9, 48, 21))
    add('caixa', f_box(), (2, 12, 20, 7))
    add('caixa-aberta', f_box(True), (2, 12, 20, 7))
    add('vaso', f_plant(), (3, 15, 8, 9))
    add('vaso-grande', f_plant(True), (3, 21, 12, 9))
    add('estante', f_bookshelf(), (1, 26, 26, 10))
    add('mesa-reuniao', f_meeting_table(), (4, 4, 108, 42))
    add('mesa-pequena', f_small_table(), (1, 4, 42, 42))
    add('mesa-pequena-claro', f_small_table('claro'), (1, 4, 42, 42))
    add('mesa-pequena-escuro', f_small_table('escuro'), (1, 4, 42, 42))
    add('quadro-branco', f_whiteboard(), None, 'wall')
    add('quadro-vazio', f_whiteboard(False), None, 'fx')
    add('quadro-letras', f_whiteboard_letters(), None, 'fx')
    add('cards-chao', f_cards_floor(), None, 'fx')
    add('tv', f_tv(), None, 'wall')
    add('janela', f_window(), None, 'wall')
    add('quadro', f_picture(), None, 'wall')
    add('mural', f_bulletin(), None, 'wall')
    add('relogio', f_clock(), None, 'wall')
    add('copiadora', f_copier(), (1, 14, 26, 16))
    add('arquivo', f_cabinet(), (1, 18, 14, 10))
    add('arquivo-verde', f_cabinet('#5d6e58'), (1, 18, 14, 10))
    add('arquivo-tablet', f_cabinet(tablet=True), (1, 27, 14, 10))
    add('prateleira', f_shelf_boxes(), (1, 22, 28, 10))
    add('servidor', f_server(), (1, 26, 18, 10))
    add('mainframe', f_mainframe(), (1, 34, 40, 11))
    add('armario', f_cabinet_doors(), (1, 24, 22, 10))
    add('bancada', f_counter(), (1, 14, 74, 16))
    add('geladeira', f_fridge(), (1, 26, 18, 10))
    add('bebedouro', f_cooler(), (1, 20, 12, 10))
    add('poltrona', f_armchair(), (1, 6, 18, 14))
    add('mesinha', f_round_table(), (2, 4, 16, 14))
    add('mesinha-tablet', f_round_table(True), (2, 4, 16, 14))
    add('balcao', f_reception(), (1, 8, 82, 22))
    add('lixeira', f_trash(), (1, 5, 8, 7))
    add('tapete', f_rug(), None, 'floor')
    for pose in ('bravo-a', 'bravo-b', 'feliz-a', 'feliz-b'):
        add(f'ceo-{pose}', ceo(NPC_LOOKS[5], pose), (2, 14, 16, 12))
    add('fumaca', f_smoke(), None, 'fx')
    add('alerta', f_alert(), None, 'fx')
    add('confete', f_confetti(), None, 'fx')
    add('cadeira-vazia', empty_chair(), None, 'fx')
    add('placa-liberado', f_sign(), None, 'fx')
    add('tela-ligada', f_screen_glow(), None, 'fx')
    add('raiva', f_angry(), None, 'fx')
    add('tablet-mao', f_tablet_hand(), None, 'fx')
    add('tablet-chao', f_tablet_floor(), None, 'fx')
    add('zzz', f_zzz(), None, 'fx')
    add('nota-a', f_note('a'), None, 'fx')
    add('nota-b', f_note('b'), None, 'fx')
    add('celular', f_phone_ring(), None, 'fx')
    add('coracao', f_heart(), None, 'fx')
    add('conversa', f_chat(), None, 'fx')
    add('abraco-a', hug('a'), None, 'fx')
    add('abraco-b', hug('b'), None, 'fx')
    add('luz-tela', f_screen_light(), None, 'fx')
    add('led', f_led(), None, 'fx')
    add('viva-a', cheer('a'), None, 'fx')
    add('estagiario-sentado', intern_seated(), None, 'fx')
    add('viva-b', cheer('b'), None, 'fx')
    add('viva-molhado-a', cheer('a', wet=True), None, 'fx')
    add('viva-molhado-b', cheer('b', wet=True), None, 'fx')
    add('mictorio', f_urinal(), (1, 17, 10, 4))
    add('palavras-parede', f_wall_words(), None, 'wall')
    add('placa-banheiro', f_wc_sign(), None, 'wall')
    add('poca', f_puddle(), None, 'fx')
    add('vontade', f_urge(), None, 'fx')
    add('copias', f_copies(), None, 'fx')
    add('papel-frases', f_paper_sheet(), None, 'fx')
    add('painel-alarme', f_alarm_panel(), (3, 22, 8, 4))
    add('placa-arduino', f_board_floor('arduino'), None, 'fx')
    add('placa-raspberry', f_board_floor('raspberry'), None, 'fx')
    add('brilho-placa', f_board_glow(), None, 'fx')
    for kind in PART_KINDS:
        add(f'peca-{kind}', f_part_floor(kind), None, 'fx')
    add('lupa', f_magnifier(), None, 'fx')
    for kind in ('papel', 'pasta', 'caixa', 'cabo', 'livro', 'grampeador'):
        add(f'bagunca-{kind}', f_mess(kind), None, 'fx')
    for kind, col in STICKER_COLORS.items():
        add(f'adesivo-{kind}', f_sticker(col), None, 'fx')
    for i, look in enumerate(NPC_LOOKS):
        add(f'colega-{i}', npc_seated(look), (2, 12, 16, 12))
        add(f'colega-{i}-b', npc_seated_typing(look), (2, 12, 16, 12))

    # atlas: empacota em linhas
    frames = {}
    max_w = 512
    x = y = row_h = 0
    placed = []
    for name, t in types.items():
        im = t['canvas'].scaled()
        if x + im.width > max_w:
            x, y, row_h = 0, y + row_h + 2, 0
        placed.append((name, im, x, y))
        frames[name] = {'frame': {'x': x, 'y': y, 'w': im.width, 'h': im.height}, 'rotated': False, 'trimmed': False,
                        'spriteSourceSize': {'x': 0, 'y': 0, 'w': im.width, 'h': im.height},
                        'sourceSize': {'w': im.width, 'h': im.height}}
        x += im.width + 2
        row_h = max(row_h, im.height)
    atlas = Image.new('RGBA', (max_w, y + row_h), (0, 0, 0, 0))
    for name, im, ax, ay in placed:
        atlas.paste(im, (ax, ay))
    atlas.save(os.path.join(ASSETS, 'moveis.png'), optimize=True)
    with open(os.path.join(ASSETS, 'moveis.json'), 'w') as fh:
        json.dump({'frames': frames, 'meta': {'image': 'moveis.png', 'size': {'w': max_w, 'h': y + row_h}, 'scale': '1'}},
                  fh, indent=1)

    # -------- posicionamento (em px do jogo; 1 tile = 32)
    P = T * SCALE
    items = []

    def put(kind, tx, ty, label=None):
        """Coloca o móvel com o canto de cima à esquerda no tile (tx, ty) (aceita frações)."""
        items.append({'type': kind, 'x': round(tx * P), 'y': round(ty * P), 'label': label or kind})

    # Diretoria (x 1-13, piso y 3-8)
    put('janela', 3, 1.2)
    put('quadro', 8, 1.3)
    put('estante', 10.5, 1.9, 'Estante')
    put('vaso-grande', 1.2, 2.2, 'Vaso')
    put('tapete', 3, 4.3)
    put('ceo-bravo-a', 6.3, 4.1, 'CEO')
    put('mesa-diretor', 4.5, 5.2, 'Mesa do diretor')
    put('lixeira', 9.3, 7.2, 'Lixeira')

    # Reuniões (x 15-30)
    put('tv', 21, 1.2)
    put('quadro-branco', 26.5, 1.2, 'Quadro branco')
    put('vaso', 15.3, 2.4, 'Vaso')
    put('mesa-reuniao', 16.6, 3.6, 'Mesa de reunião')
    put('armario', 29.4, 6.0, 'Armário da reunião')

    # RH (x 32-38) e Financeiro (x 40-46): cada sala ganha uma mesa nova vazia e uma caixa com um
    # computador para montar (missão 3)
    for ox, name, n in ((32, 'RH', 1), (40, 'Financeiro', 2)):
        put('janela', ox + 2.5, 1.2)
        put('mesa-vazia', ox + 0.15, 2.9, f'Mesa nova {n}')
        put('caixa', ox + 0.95, 6.0, f'Caixa {n}')
        put('mesa-pequena-claro' if n == 1 else 'mesa-pequena-escuro', ox + 3.55, 3.7, f'Mesa do {name}')
        put('vaso', ox + 6.0, 7.4, 'Vaso')

    # Impressão e almoxarifado (x 1-10, piso y 14-18)
    put('mural', 6.5, 12.3)
    put('copiadora', 1.3, 13.2, 'Copiadora')
    put('prateleira', 3.6, 13.0, 'Prateleira')
    put('prateleira', 5.6, 13.0, 'Prateleira')
    put('vaso', 8.8, 13.6, 'Vaso')
    put('arquivo', 1.3, 16.8, 'Arquivo')
    put('arquivo', 2.4, 16.8, 'Arquivo')
    put('arquivo-verde', 3.5, 16.8, 'Arquivo')
    put('lixeira', 5.0, 17.9, 'Lixeira')

    # Copa (x 36-46, piso y 14-18)
    put('bancada', 36.4, 13.2, 'Bancada')
    put('bebedouro', 41.5, 13.3, 'Bebedouro')
    put('geladeira', 42.8, 12.9, 'Geladeira')
    put('vaso', 45.0, 13.6, 'Vaso')
    put('poltrona', 38.6, 16.4, 'Poltrona')
    put('mesinha-tablet', 40.0, 16.4, 'Mesinha')
    put('poltrona', 41.4, 16.4, 'Poltrona')
    put('vaso-grande', 45.3, 16.9, 'Vaso')

    # TI (x 1-10, piso y 24-28)
    put('servidor', 1.4, 22.9, 'Servidor')
    put('servidor', 2.7, 22.9, 'Servidor')
    put('servidor', 4.0, 22.9, 'Servidor')
    put('mainframe', 8.3, 22.3, 'Mainframe')
    put('colega-0', 5.0, 25.1, 'Colega da TI')
    put('mesa-pc-1', 4.3, 25.9, 'Mesa da TI')

    # Arquivo (x 36-40, porta à esquerda)
    for i, tx in enumerate((36.2, 37.3, 38.4, 39.5)):
        if i == 2:
            put('arquivo-tablet', tx, 23.0 - 9 * SCALE / P, 'Arquivo com tablet')
        else:
            put('arquivo-verde' if i == 3 else 'arquivo', tx, 23.0, 'Arquivo')
    put('lixeira', 36.3, 27.9, 'Lixeira')
    put('vaso-grande', 39.6, 26.9, 'Vaso')

    # Banheiro (x 42-46, porta em cima): 3 mictórios com palavras rabiscadas na parede (fase 3, missão 5)
    put('placa-banheiro', 44.25, 20.7, 'Placa do banheiro')
    put('palavras-parede', 44.1, 22.15, 'Palavras na parede')
    for i, tx in enumerate((44.1, 45.15, 46.2)):
        put('mictorio', tx - 0.05, 23.15, f'Mictório {i + 1}')

    # Área de trabalho: 2 fileiras x 3 estações (colega sentado + mesa)
    looks = [0, 1, 2, 3, 4, 2]
    for i, (tx, ty) in enumerate(((14.2, 13.0), (21.2, 13.0), (28.2, 13.0), (14.2, 18.2), (21.2, 18.2), (28.2, 18.2))):
        put(f'colega-{looks[i]}', tx + 0.9, ty, f'Colega {i + 1}')
        put(f'mesa-pc-{i % 3}', tx + 0.25, ty + 0.75, f'Estação {i + 1}')
    put('vaso-grande', 12.2, 10.9, 'Vaso')
    put('vaso-grande', 33.6, 10.9, 'Vaso')

    # Recepção
    put('relogio', 23.6, 22.9)
    put('colega-1', 22.2, 23.9, 'Recepcionista')
    put('balcao', 20.3, 24.7, 'Balcão da recepção')
    put('vaso-grande', 12.2, 27.0, 'Vaso')
    put('vaso-grande', 33.7, 27.0, 'Vaso')
    put('prateleira', 30.0, 25.2, 'Armário')
    put('painel-alarme', 26.0, 27.0, 'Painel do alarme')
    # lado de fora
    put('vaso-grande', 19.4, 29.3, 'Vaso')
    put('vaso-grande', 26.1, 29.3, 'Vaso')
    put('lixeira', 31.1, 27.6, 'Lixeira')

    type_info = {}
    for name, t in types.items():
        cv = t['canvas']
        foot = t['foot']
        type_info[name] = {
            'w': cv.w * SCALE, 'h': cv.h * SCALE, 'layer': t['layer'],
            'foot': None if foot is None else [v * SCALE for v in foot],
        }

    grid = build_grid()
    tiles = [[TILE_INDEX[tile_of(grid, x, y)] for x in range(W)] for y in range(H)]
    data = {
        '_comment': 'Gerado por scripts/gerar-arte.py — edite o script, não este arquivo.',
        'tileSize': P,
        'width': W,
        'height': H,
        'tileNames': TILE_ORDER,
        'solidTiles': [TILE_INDEX[k] for k in SOLID_TILES],
        'grid': grid,
        'tiles': tiles,
        'types': type_info,
        'items': items,
        # equipamentos pequenos desenhados em cima de móveis: tipo do móvel -> nome -> ponto (px do jogo)
        'gadgets': {k: {n: [x * SCALE, y * SCALE] for n, (x, y) in v.items()} for k, v in GADGETS.items()},
    }
    with open(os.path.join(GAME, 'office-map.json'), 'w') as fh:
        json.dump(data, fh, separators=(',', ':'))
    print('ok:', len(items), 'móveis,', len(types), 'tipos')


if __name__ == '__main__':
    build()
