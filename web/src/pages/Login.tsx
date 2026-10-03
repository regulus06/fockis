import "../styles/Login.scss";
import LoginBrandPanel from "./Login/LoginBrandPanel";
import LoginForm from "./Login/LoginForm";
import { useLoginController } from "./Login/useLoginController";

export default function Login() {
  const login = useLoginController();

  return (
    <div className="login-page">
      <LoginBrandPanel />

      <LoginForm
        mfaMode={login.mfaMode}
        email={login.email}
        password={login.password}
        showPassword={login.showPassword}
        loading={login.loading}
        mfaCode={login.mfaCode}
        qrCode={login.qrCode}
        mfaSecret={login.mfaSecret}
        onEmailChange={login.setEmail}
        onPasswordChange={login.setPassword}
        onTogglePassword={() =>
          login.setShowPassword((value) => !value)
        }
        onSubmit={login.submit}
        onCodeChange={login.handleMfaCodeChange}
        onConfirmSetup={login.confirmMfaSetup}
        onVerify={login.verifyMfaLogin}
        onSwitchToSetup={login.switchToMfaSetup}
      />
    </div>
  );
}
