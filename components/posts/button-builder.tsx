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
    <div className="flex flex-col gap-4">
      {rows.length === 0 && (
        <div className="text-center p-6 border border-dashed border-white/10 rounded-2xl bg-white/5">
          <Link2 className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
            Nenhum botão configurado.
          </p>
        </div>
      )}

      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className="rounded-2xl border border-white/5 bg-black/20 p-4 sm:p-5 shadow-xl"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary/70">
              <GripVertical className="h-4 w-4" />
              Linha {rowIndex + 1}
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg hover:bg-white/10"
                onClick={() => moveRow(rowIndex, -1)}
                disabled={rowIndex === 0}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg hover:bg-white/10"
                onClick={() => moveRow(rowIndex, 1)}
                disabled={rowIndex === rows.length - 1}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            {row.map((btn, btnIndex) => (
              <div
                key={btnIndex}
                className="flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-900/40 p-3 sm:p-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_150px] gap-3">
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Texto do Botão</p>
                    <Input
                      placeholder="Ex.: Comprar Agora"
                      className="h-11 bg-white/5 border-white/10 rounded-xl px-4"
                      value={btn.text}
                      onChange={(e) =>
                        updateButton(rowIndex, btnIndex, { text: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Tipo</p>
                    <Select
                      value={btn.type}
                      onValueChange={(v) =>
                        updateButton(rowIndex, btnIndex, {
                          type: (v as ButtonType) ?? "url",
                        })
                      }
                    >
                      <SelectTrigger className="h-11 bg-white/5 border-white/10 rounded-xl px-4">
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

                <div className="space-y-1.5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Link ou Valor</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder={PLACEHOLDERS[btn.type]}
                      className="h-11 flex-1 bg-white/5 border-white/10 rounded-xl px-4"
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
                        className="h-11 w-11 rounded-xl hover:bg-white/10 border border-white/5"
                        onClick={() => duplicateButton(rowIndex, btnIndex)}
                        aria-label="Duplicar botão"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11 rounded-xl hover:bg-red-500/10 hover:text-red-400 border border-white/5"
                        onClick={() => removeButton(rowIndex, btnIndex)}
                        aria-label="Remover botão"
                      >
                        <Trash2 className="h-4 w-4" />
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
            className="mt-4 w-full h-10 border border-dashed border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/5 hover:text-primary hover:border-primary/20"
            onClick={() => addButton(rowIndex)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar botão nesta linha
          </Button>
        </div>
      ))}

      <Button type="button" variant="outline" onClick={addRow} className="h-12 sm:w-fit px-8 border-primary/20 bg-primary/5 text-primary font-black uppercase text-xs rounded-xl shadow-lg shadow-primary/5 active:scale-[0.98]">
        <Plus className="mr-2 h-5 w-5" />
        Adicionar nova linha de botões
      </Button>
    </div>
  )
}
