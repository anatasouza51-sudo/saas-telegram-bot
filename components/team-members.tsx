"use client"

import { memo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface TeamMember {
  id: string
  name: string
  avatar?: string
  role?: string
  storyPoints?: number
}

interface TeamMembersProps {
  members: TeamMember[]
  title?: string
  onAddMember?: () => void
}

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

const colors = [
  "bg-[#D17D55]",
  "bg-[#A9C97F]",
  "bg-[#5F8B5A]",
  "bg-[#D5A24F]",
  "bg-[#4F8B7A]",
  "bg-[#B8534E]",
]

export const TeamMembers = memo(({
  members,
  title = "Membros da Equipe",
  onAddMember,
}: TeamMembersProps) => {
  return (
    <Card className="bg-dashboard-surface border-dashboard-border overflow-hidden">
      <CardHeader className="border-b border-dashboard-border/50 bg-white/[0.01] flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-bold text-dashboard-text uppercase tracking-wider">
            {title}
          </CardTitle>
          <CardDescription className="text-xs text-dashboard-text-muted mt-1">
            {members.length} membro{members.length !== 1 ? "s" : ""}
          </CardDescription>
        </div>
        {onAddMember && (
          <Button
            size="sm"
            onClick={onAddMember}
            className="bg-dashboard-accent hover:bg-dashboard-accent/90 text-white font-bold gap-2 text-xs"
          >
            <Plus className="w-3 h-3" />
            Adicionar
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-3">
          {members.map((member, index) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="flex flex-col items-center gap-2 group cursor-pointer"
            >
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center text-xs font-black text-white transition-transform group-hover:scale-110",
                colors[index % colors.length]
              )}>
                {member.avatar ? (
                  <img 
                    src={member.avatar} 
                    alt={member.name}
                    className="w-full h-full rounded-xl object-cover"
                  />
                ) : (
                  getInitials(member.name)
                )}
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-dashboard-text truncate max-w-[80px]">
                  {member.name.split(" ")[0]}
                </p>
                {member.role && (
                  <p className="text-[10px] text-dashboard-text-muted truncate max-w-[80px]">
                    {member.role}
                  </p>
                )}
                {member.storyPoints !== undefined && (
                  <p className="text-[10px] font-bold text-dashboard-accent mt-1">
                    {member.storyPoints} pts
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
})

TeamMembers.displayName = "TeamMembers"
