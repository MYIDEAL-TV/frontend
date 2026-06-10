import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const ContractSuccess = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-center text-2xl">Contrat Envoyé!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            Merci de votre soumission. Votre correspondant doit maintenant signer votre document.
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => navigate("/new-subscription", { replace: true })} className="w-full">
              Nouvelle Souscription
            </Button>
            <Button onClick={() => navigate("/")} variant="outline" className="w-full">
              Retour au Site
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContractSuccess;
