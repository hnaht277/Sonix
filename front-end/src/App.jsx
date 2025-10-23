import React from "react";
import { UserProvider } from "./contexts/userContext";
import { ErrorProvider, useError } from "./contexts/errorContext";

const App = () => {
  return (
    <ErrorProvider>
      <UserProvider>
        <div>
          <h1 className="text-4xl font-bold text-center">Sonix</h1>
        </div>
      </UserProvider>
    </ErrorProvider>
  );
};

export default App;
