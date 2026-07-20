"use client"

import {
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Link2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  BUTTON_TYPE_LABELS,
  type ButtonRows,
  type ButtonType,
  type PostButton,
} from "@/lib/tg/buttons"
import { cn } from "@/lib/utils"

const PLACEHOLDERS: Record<ButtonType, string> = {
  url: "https://exemplo.com",
  site: "https://seusite.com",
  callback: "dados_callback (máx 64)",
  deeplink: "https://t.me/seubot?start=promo",
  telegram: "@canal ou t.me/canal",
  whatsapp: "5511999999999",
  instagram: "@seuperfil",
}

export function ButtonBuilder({
  rows,
  onChange,
}: {
  rows: ButtonRows
  onChange: (rows: ButtonRows) => void
}) {
  function update(next: ButtonRows) {
    onChange(next)
  }

  function addRow() {
    update([...rows, [{ text: "", type: "url", value: "" }]])
  }

  function addButton(rowIndex: number) {
    const next = rows.map((row, i) =>
      i === rowIndex ? [...row, { text: "", type: "url" as ButtonType, value: "" }] : row,
    )
    update(next)
  }

  function updateButton(
    rowIndex: number,
    btnIndex: number,
    patch: Partial<PostButton>,
  ) {
    const next = rows.map((row, i) =>
      i === rowIndex
        ? row.map((b, j) => (j === btnIndex ? { ...b, ...patch } : b))
        : row,
    )
    update(next)
  }

  function removeButton(rowIndex: number, btnIndex: number) {
    const next = rows
      .map((row, i) => (i === rowIndex ? row.filter((_, j) => j !== btnIndex) : row))
      .filter((row) => row.length > 0)
    update(next)
  }

  function duplicateButton(rowIndex: number, btnIndex: number) {
    const next = rows.map((row, i) =>
      i === rowIndex
        ? [...row.slice(0, btnIndex + 1), { ...row[btnIndex] }, ...row.slice(btnIndex + 1)]
        : row,
    )
    update(next)
  }

  function moveRow(rowIndex: number, dir: -1 | 1) {
    const target = rowIndex + dir
    if (target < 0 || target >= rows.length) return
    const next = [...rows]
    ;[next[rowIndex], next[target]] = [next[target], next[rowIndex]]
    update(next)
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.length === 0 && (
        <div className="text-center p-5 border border-dashed border-white/10 rounded-xl bg-white/5">
          <Link2 className="w-6 h-6 mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            Nenhum botão configurado.
          </p>
        </div>
      )}

      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className="rounded-xl border border-white/5 bg-black/20 p-3 shadow-xl"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary/70">
              <GripVertical className="h-3.5 w-3.5" />
              Linha {rowIndex + 1}
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg hover:bg-white/10"
                onClick={() => moveRow(rowIndex, -1)}
                disabled={rowIndex === 0}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg hover:bg-white/10"
                onClick={() => moveRow(rowIndex, 1)}
                disabled={rowIndex === rows.length - 1}
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="grid gap-3">
            {row.map((btn, btnIndex) => (
              <div
                key={btnIndex}
                className="flex flex-col gap-2 rounded-xl border border-white/10 bg-slate-900/40 p-3"
              >
                {/* Texto do botão e tipo — empilhados no mobile */}
                <div className="flex flex-col gap-2">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Texto do Botão</p>
                    <Input
                      placeholder="Ex.: Comprar Agora"
                      className="h-9 bg-white/5 border-white/10 rounded-xl px-3 text-sm"
                      value={btn.text}
                      onChange={(e) =>
                        updateButton(rowIndex, btnIndex, { text: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Tipo</p>
                    <Select
                      value={btn.type}
                      onValueChange={(v) =>
                        updateButton(rowIndex, btnIndex, {
                          type: (v as ButtonType) ?? "url",
                        })
                      }
                    >
                      <SelectTrigger className="h-9 bg-white/5 border-white/10 rounded-xl px-3 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(BUTTON_TYPE_LABELS) as ButtonType[]).map((t) => (
                          <SelectItem key={t} value={t}>
                            {BUTTON_TYPE_LABELS[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Link/Valor + ações */}
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Link ou Valor</p>
                  <div className="flex gap-1.5">
                    <Input
                      placeholder={PLACEHOLDERS[btn.type]}
                      className="h-9 flex-1 bg-white/5 border-white/10 rounded-xl px-3 text-sm min-w-0"
                      value={btn.value}
                      onChange={(e) =>
                        updateButton(rowIndex, btnIndex, { value: e.target.value })
                      }
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl hover:bg-white/10 border border-white/5"
                        onClick={() => duplicateButton(rowIndex, btnIndex)}
                        aria-label="Duplicar botão"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl hover:bg-red-500/10 hover:text-red-400 border border-white/5"
                        onClick={() => removeButton(rowIndex, btnIndex)}
                        aria-label="Remover botão"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-3 w-full h-9 border border-dashed border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/5 hover:text-primary hover:border-primary/20"
            onClick={() => addButton(rowIndex)}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Adicionar botão nesta linha
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={addRow}
        className="w-full h-10 border-primary/20 bg-primary/5 text-primary font-black uppercase text-xs rounded-xl shadow-lg shadow-primary/5 active:scale-[0.98]"
      >
        <Plus className="mr-1.5 h-4 w-4" />
        Adicionar nova linha de botões
      </Button>
    </div>
  )
}
