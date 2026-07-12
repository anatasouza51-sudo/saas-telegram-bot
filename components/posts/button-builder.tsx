"use client"

import {
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  GripVertical,
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
        <p className="text-sm text-muted-foreground">
          Nenhum botão. Adicione linhas e botões que aparecerão sob a mensagem.
        </p>
      )}

      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className="rounded-lg border border-border bg-muted/30 p-3"
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <GripVertical className="h-3.5 w-3.5" />
              Linha {rowIndex + 1}
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => moveRow(rowIndex, -1)}
                disabled={rowIndex === 0}
                aria-label="Mover linha para cima"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => moveRow(rowIndex, 1)}
                disabled={rowIndex === rows.length - 1}
                aria-label="Mover linha para baixo"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {row.map((btn, btnIndex) => (
              <div
                key={btnIndex}
                className="flex flex-col gap-2 rounded-md border border-border bg-background p-2 sm:flex-row sm:items-center"
              >
                <Input
                  placeholder="Texto do botão"
                  className="sm:w-40"
                  value={btn.text}
                  onChange={(e) =>
                    updateButton(rowIndex, btnIndex, { text: e.target.value })
                  }
                />
                <Select
                  value={btn.type}
                  onValueChange={(v) =>
                    updateButton(rowIndex, btnIndex, {
                      type: (v as ButtonType) ?? "url",
                    })
                  }
                >
                  <SelectTrigger className="sm:w-36">
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
                <Input
                  placeholder={PLACEHOLDERS[btn.type]}
                  className="flex-1"
                  value={btn.value}
                  onChange={(e) =>
                    updateButton(rowIndex, btnIndex, { value: e.target.value })
                  }
                />
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => duplicateButton(rowIndex, btnIndex)}
                    aria-label="Duplicar botão"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeButton(rowIndex, btnIndex)}
                    aria-label="Remover botão"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => addButton(rowIndex)}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Botão na mesma linha
          </Button>
        </div>
      ))}

      <Button type="button" variant="outline" onClick={addRow} className="self-start">
        <Plus className="mr-2 h-4 w-4" />
        Adicionar linha de botões
      </Button>
    </div>
  )
}
