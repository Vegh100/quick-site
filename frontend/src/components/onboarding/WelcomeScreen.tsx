import { useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import {
  MapPin,
  Search,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Star,
  Loader2,
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import { useCategories } from "../../hooks/useApi";
import { useAuth } from "../../contexts/AuthContext";

const CATEGORY_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-yellow-500",
  "bg-teal-500",
  "bg-red-500",
];

const benefits = [
  {
    image:
      "https://images.unsplash.com/photo-1587567818566-3272be7d64c9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2ZXJpZmllZCUyMHByb2Zlc3Npb25hbCUyMHdvcmtlciUyMGJhZGdlfGVufDF8fHx8MTc3MDYzMTg4NHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    title: "Ellenőrzött szolgáltatók",
    description: "Minden szolgáltató háttérellenőrzésen esett át",
  },
  {
    image:
      "https://images.unsplash.com/photo-1729860646477-c0f603c0300b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbnN0YW50JTIwb25saW5lJTIwYm9va2luZyUyMHNtYXJ0cGhvbmV8ZW58MXx8fHwxNzcwNjMxODg0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    title: "Azonnali foglalás",
    description: "Foglalj szolgáltatást másodpercek alatt, valós idejű elérhetőséggel",
  },
  {
    image:
      "https://images.unsplash.com/photo-1481015172496-8cfcb0d85e59?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjdXN0b21lciUyMHNhdGlzZmFjdGlvbiUyMHJhdGluZyUyMHN0YXJzfGVufDF8fHx8MTc3MDYzMTg4N3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    title: "Minőségi szolgáltatás",
    description: "4.9/5 átlagos értékelés 50 000+ foglalásból",
  },
];

export function WelcomeScreen() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const { data: categoriesData, isLoading: loadingCategories } = useCategories();
  const [locationInput, setLocationInput] = useState("");
  const apiCategories = categoriesData?.data || [];

  const goToCustomerApp = (category?: string) => {
    const params = new URLSearchParams();
    const city = locationInput.trim();
    if (category) params.set("kategoria", category);
    if (city) params.set("varos", city);

    const canUseCustomerApp = isAuthenticated && user?.role === "CUSTOMER";
    const basePath = canUseCustomerApp ? "/ugyfel" : "/szolgaltatasok";
    const query = params.toString();
    navigate(query ? `${basePath}?${query}` : basePath);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
              <span className="text-white text-xl">Q</span>
            </div>
            <span className="font-semibold">Qvick</span>
          </div>

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() =>
                  navigate(
                    user?.role === "PROVIDER" || user?.role === "EMPLOYEE"
                      ? "/szolgaltato"
                      : "/ugyfel",
                  )
                }
              >
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Irányítópult
              </Button>
              <Button variant="ghost" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Kilépés
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate("/regisztracio/szolgaltato")}>
                Vállalkozásoknak
              </Button>
              <Button variant="ghost" onClick={() => navigate("/bejelentkezes")}>
                Bejelentkezés
              </Button>
              <Button variant="outline" onClick={() => navigate("/regisztracio/ugyfel")}>
                Regisztráció
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-tertiary via-background to-background">
        <div className="container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                <TrendingUp className="h-3 w-3 mr-1" />
                10 000+ elégedett ügyfél
              </Badge>

              <h1 className="mb-6 text-4xl md:text-6xl">
                Helyi szolgáltatások
                <br />
                <span className="text-primary">pár kattintásra</span>
              </h1>

              <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                Lakástakarítás és autókozmetika - találd meg a megbízható helyi szolgáltatókat
                pillanatok alatt.
              </p>

              {/* Search Bar */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="max-w-2xl mx-auto mb-8"
              >
                <div className="flex gap-2 p-2 bg-card rounded-2xl border-2 shadow-xl">
                  <div className="flex-1 flex items-center gap-3 px-4">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="Add meg a tartózkodási helyed..."
                      className="border-0 focus-visible:ring-0 text-base"
                      value={locationInput}
                      onChange={(event) => setLocationInput(event.target.value)}
                      onKeyDown={(event) => event.key === "Enter" && goToCustomerApp()}
                    />
                  </div>
                  <Button size="lg" className="rounded-xl px-8" onClick={() => goToCustomerApp()}>
                    <Search className="h-5 w-5 mr-2" />
                    Keresés
                  </Button>
                </div>
              </motion.div>

              {/* Quick Stats */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="flex items-center justify-center gap-8 text-sm"
              >
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-muted-foreground">4.9/5 Értékelés</span>
                </div>
                <div className="text-muted-foreground">50 000+ Foglalás</div>
                <div className="text-muted-foreground">500+ Szolgáltató</div>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-accent/10 rounded-full blur-3xl" />
      </section>

      {/* Service Categories */}
      <section className="py-16 bg-card">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl font-bold mb-3">Népszerű szolgáltatások</h2>
            <p className="text-muted-foreground">Mit keresel ma?</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {loadingCategories ? (
              <div className="col-span-full flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              apiCategories.map((category, index) => (
                <motion.div
                  key={category.id}
                  initial={{ y: 20, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.4 }}
                  onClick={() => goToCustomerApp(category.slug)}
                  className="p-6 bg-background rounded-2xl border-2 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
                >
                  <div
                    className={`${CATEGORY_COLORS[index % CATEGORY_COLORS.length]} h-12 w-12 rounded-xl flex items-center justify-center mx-auto mb-3`}
                  >
                    <span className="text-xl">{category.icon || "🔧"}</span>
                  </div>
                  <p className="text-sm font-medium">{category.name}</p>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl font-bold mb-3">Miért a Qvick?</h2>
            <p className="text-muted-foreground">
              A legegyszerűbb módja a helyi szolgáltatások foglalásának
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {benefits.map((benefit, index) => {
              return (
                <motion.div
                  key={benefit.title}
                  initial={{ y: 20, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2, duration: 0.6 }}
                >
                  <Card className="p-8 text-center h-full border-2 hover:border-primary/30 transition-all overflow-hidden group">
                    <div className="aspect-square w-full rounded-2xl overflow-hidden mb-6 relative">
                      <ImageWithFallback
                        src={benefit.image}
                        alt={benefit.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{benefit.title}</h3>
                    <p className="text-muted-foreground">{benefit.description}</p>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA for Providers */}
      <section className="py-16 bg-gradient-to-br from-accent/10 to-primary/10">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl font-bold mb-3">Kezdj el a Qvick-kel</h2>
            <p className="text-muted-foreground">
              Válaszd ki, hogyan szeretnéd használni a platformot
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* Customer Card */}
            <motion.div
              initial={{ x: -50, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="p-8 h-full border-2 hover:border-primary/50 transition-all hover:shadow-xl group overflow-hidden">
                <div className="flex flex-col h-full">
                  <div className="w-full aspect-video rounded-2xl overflow-hidden mb-6 relative">
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1662638035662-455f32fd02ad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYXBweSUyMGN1c3RvbWVyJTIwYnJvd3NpbmclMjBwaG9uZSUyMHNlcnZpY2VzfGVufDF8fHx8MTc3MDYzMjAzOHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                      alt="Customer browsing services"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/30 to-transparent" />
                  </div>

                  <h2 className="text-xl font-bold mb-3">Szolgáltatást keresek</h2>
                  <p className="text-muted-foreground mb-6 flex-1">
                    Találd meg és foglald le a legjobb helyi szolgáltatókat lakástakarításhoz és
                    autókozmetikához.
                  </p>

                  <div className="space-y-3">
                    <Button
                      onClick={() => goToCustomerApp()}
                      className="w-full justify-between"
                      size="lg"
                    >
                      Szolgáltatások böngészése
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                    <Button
                      onClick={() =>
                        isAuthenticated
                          ? navigate("/ugyfel/bemutatkozas")
                          : navigate("/regisztracio/ugyfel")
                      }
                      variant="outline"
                      className="w-full"
                    >
                      Ügyfél fiók létrehozása
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Provider Card */}
            <motion.div
              initial={{ x: 50, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="p-8 h-full border-2 hover:border-accent/50 transition-all hover:shadow-xl group overflow-hidden">
                <div className="flex flex-col h-full">
                  <div className="w-full aspect-video rounded-2xl overflow-hidden mb-6 relative">
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1640323240640-ee731d18dcb1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBzZXJ2aWNlJTIwcHJvdmlkZXIlMjBidXNpbmVzcyUyMG93bmVyfGVufDF8fHx8MTc3MDYzMjAzOXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                      alt="Professional service provider"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-accent/30 to-transparent" />
                  </div>

                  <h2 className="text-xl font-bold mb-3">Szolgáltató vagyok</h2>
                  <p className="text-muted-foreground mb-6 flex-1">
                    Növeld a vállalkozásodat – kapcsolódj ügyfelekhez, akiknek szükségük van a
                    szolgáltatásaidra
                  </p>

                  <div className="space-y-3">
                    <Button
                      onClick={() =>
                        isAuthenticated
                          ? navigate("/szolgaltato/bemutatkozas")
                          : navigate("/regisztracio/szolgaltato")
                      }
                      className="w-full justify-between bg-accent hover:bg-accent/90"
                      size="lg"
                    >
                      Indítás szolgáltatóként
                      <Sparkles className="h-5 w-5" />
                    </Button>
                    <p className="text-sm text-muted-foreground text-center">
                      30 napos ingyenes próba • Bankkártya nem szükséges
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 bg-card">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Qvick. Minden jog fenntartva.</p>
        </div>
      </footer>
    </div>
  );
}
