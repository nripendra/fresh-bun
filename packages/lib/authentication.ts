export class Principal {
  constructor(
    public readonly id: string,
    public readonly claims: Record<string, unknown> = {}
  ) {}

  hasClaim(claimName: string) {
    const claim = this.claims[claimName];
    return !!claim;
  }
  getClaim<ClaimType>(
    claimName: string,
    defaultValue?: ClaimType
  ): ClaimType | null {
    const claim = this.claims[claimName];
    if (claim) {
      return claim as unknown as ClaimType;
    }
    return defaultValue ?? null;
  }
}

export enum WellKnownClaims {
  Username = "Username",
  Email = "Email",
  FirstName = "FirstName",
  LastName = "LastName",
  Roles = "Roles",
  ProfilePic = "ProfilePic",
  LoginTime = "LoginTime",
  AuthType = "AuthType",
}

export class AnonymousPrincipal extends Principal {
  constructor() {
    super(AnonymousPrincipal.ID);
  }

  static ID = "Anonymous";
}

export enum WellknownAuthType {
  BASIC = "BASIC",
  CREDENTIALS = "CREDENTIALS",
  WEBAUTHN = "WEBAUTHN",
  SESSION = "SESSION",
  JWT_BEARER = "JWT_BEARER",
}

export class Authentication {
  #authenticationType: WellknownAuthType | string;
  constructor(
    authenticationType: WellknownAuthType | string,
    public principal: Principal
  ) {
    this.#authenticationType = authenticationType;
  }

  get authenticationType() {
    return this.#authenticationType;
  }

  public restore(authentication: Authentication) {
    this.#authenticationType = authentication.authenticationType;
    this.principal = authentication.principal;
  }

  public authenticate(principal: Principal) {
    this.principal = principal;
  }

  public clear() {
    this.principal = new AnonymousPrincipal();
  }
}
