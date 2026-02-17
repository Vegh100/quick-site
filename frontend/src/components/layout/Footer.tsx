import { Separator } from "../ui/separator";

export function Footer() {
  return (
    <footer className="border-t bg-muted/30 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-white">Q</span>
              </div>
              <span>Qvick</span>
            </div>
            <p className="text-muted-foreground text-sm">
              Foglalj automatikusan, növeld a vállalkozásod erőfeszítés nélkül.
            </p>
          </div>

          <div>
            <h4 className="mb-3">Termék</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Funkciók
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Árazás
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Vállalkozásoknak
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Ügyfeleknek
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3">Cég</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Rólunk
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Kapcsolat
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Karrier
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Blog
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3">Jogi</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Adatvédelem
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Felhasználási feltételek
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Cookie szabályzat
                </a>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="mb-6" />

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Qvick. Minden jog fenntartva.</p>
          <p>v1.0.0 • Powered by Qvick</p>
        </div>
      </div>
    </footer>
  );
}
