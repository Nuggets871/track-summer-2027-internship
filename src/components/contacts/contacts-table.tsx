"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Users, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { ContactForm } from "@/components/forms/contact-form";
import { CONTACT_TYPES, NETWORKING_STAGES, labelFor, colorFor } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { ContactWithRelations } from "@/lib/data/contacts";
import type { ReferenceData } from "@/lib/data/reference";

export function ContactsTable({ contacts, reference }: { contacts: ContactWithRelations[]; reference: ReferenceData }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    let rows = contacts;
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((c) => `${c.firstName} ${c.lastName} ${c.company?.name ?? ""} ${c.position ?? ""}`.toLowerCase().includes(q));
    }
    if (typeFilter.length) rows = rows.filter((c) => typeFilter.includes(c.contactType));
    return rows;
  }, [contacts, search, typeFilter]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground" />
          <Input placeholder="Rechercher un contact..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Type {typeFilter.length > 0 && `(${typeFilter.length})`}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {CONTACT_TYPES.map((t) => (
              <DropdownMenuCheckboxItem
                key={t.value}
                checked={typeFilter.includes(t.value)}
                onCheckedChange={(c) => setTypeFilter((prev) => (c ? [...prev, t.value] : prev.filter((v) => v !== t.value)))}
              >
                {t.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex-1" />
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus /> Nouveau contact
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="Aucun contact" />
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Entreprise</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Proximité</TableHead>
                <TableHead>Networking</TableHead>
                <TableHead>Dernière interaction</TableHead>
                <TableHead>Prochaine relance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/contacts/${c.id}`} className="flex items-center gap-2.5 hover:underline">
                      <Avatar name={`${c.firstName} ${c.lastName}`} size={28} />
                      <span className="flex flex-col">
                        <span className="font-medium text-foreground">
                          {c.firstName} {c.lastName}
                        </span>
                        <span className="text-xs text-muted-foreground">{c.position}</span>
                      </span>
                      {c.linkedin && <Link2 className="size-3.5 text-subtle-foreground" />}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.company?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{labelFor(CONTACT_TYPES, c.contactType)}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={`size-1.5 rounded-full ${i < c.relationshipStrength ? "bg-primary" : "bg-surface-muted"}`} />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {c.networkingStage ? (
                      <Badge dotColor={colorFor(NETWORKING_STAGES.map((s) => ({ value: s.key, color: s.color })), c.networkingStage)}>
                        {NETWORKING_STAGES.find((s) => s.key === c.networkingStage)?.label}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(c.lastInteractionAt)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(c.nextFollowUpDate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Nouveau contact</DialogTitle>
          </DialogHeader>
          <DialogBody className="pb-5">
            <ContactForm reference={reference} onSuccess={() => setCreateOpen(false)} />
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}
