import { useState } from "react";
import { useProviderClients } from "../../hooks/useApi";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback } from "../ui/avatar";
import {
  Search,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  Star,
  Users,
  Loader2,
} from "lucide-react";

interface ClientManagementProps {
  memberId?: string;
}

export function ClientManagement({ memberId }: ClientManagementProps = {}) {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: clientsData, isLoading } = useProviderClients(
    1,
    50,
    true,
    memberId,
  );

  const clients = clientsData?.data?.clients || [];
  const filteredClients = clients.filter((client) => {
    const name = `${client.firstName || ""} ${client.lastName || ""}`;
    return (
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const getInitials = (firstName: string | null, lastName: string | null) => {
    return `${(firstName || "?")[0]}${(lastName || "")[0]}`.toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Összes ügyfél</p>
              <h3 className="mt-2">{clientsData?.data?.meta?.total || 0}</h3>
            </div>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Ügyfél keresése..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Client list */}
      {filteredClients.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Nincsenek ügyfelek</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredClients.map((client) => {
            const lastBooking = client.bookingsAsCustomer?.[0];
            return (
              <Card key={client.id} className="p-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>
                      {getInitials(client.firstName, client.lastName)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 grid md:grid-cols-4 gap-4">
                    <div>
                      <h4 className="font-semibold">
                        {client.firstName} {client.lastName}
                      </h4>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {client.email}
                      </div>
                      {client.phone && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {client.phone}
                        </div>
                      )}
                    </div>

                    {lastBooking && (
                      <>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>
                            Utolsó:{" "}
                            {new Date(
                              lastBooking.scheduledDate,
                            ).toLocaleDateString("hu-HU")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span>{Number(lastBooking.totalAmount)} RON</span>
                        </div>
                        <div>
                          <Badge>{lastBooking.status}</Badge>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
