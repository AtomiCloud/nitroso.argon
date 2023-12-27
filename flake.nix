{
  inputs = {
    # util
    flake-utils.url = "github:numtide/flake-utils";
    treefmt-nix.url = "github:numtide/treefmt-nix";
    pre-commit-hooks.url = "github:cachix/pre-commit-hooks.nix";

    # registry
    nixpkgs.url = "nixpkgs/808c0d8c53c7ae50f82aca8e7df263225cf235bf";
    nixpkgs-2305.url = "nixpkgs/nixos-23.05";
    nixpkgs-dec-26-23.url = "nixpkgs/6df37dc6a77654682fe9f071c62b4242b5342e04";
    atomipkgs.url = "github:kirinnee/test-nix-repo/v22.1.0";
    atomipkgs_classic.url = "github:kirinnee/test-nix-repo/classic";

  };
  outputs =
    { self

      # utils
    , flake-utils
    , treefmt-nix
    , pre-commit-hooks

      # registries
    , atomipkgs
    , atomipkgs_classic
    , nixpkgs
    , nixpkgs-2305
    , nixpkgs-dec-26-23

    } @inputs:
    (flake-utils.lib.eachDefaultSystem
      (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          pkgs-2305 = nixpkgs-2305.legacyPackages.${system};
          pkgs-dec-26-23 = nixpkgs-dec-26-23.legacyPackages.${system};
          atomi = atomipkgs.packages.${system};
          atomi_classic = atomipkgs_classic.packages.${system};
          pre-commit-lib = pre-commit-hooks.lib.${system};
        in
        with rec {
          pre-commit = import ./nix/pre-commit.nix {
            inherit packages pre-commit-lib formatter;
          };
          formatter = import ./nix/fmt.nix {
            inherit treefmt-nix pkgs;
          };
          packages = import ./nix/packages.nix
            {
              inherit pkgs pkgs-2305 atomi atomi_classic pkgs-dec-26-23;
            };
          env = import ./nix/env.nix {
            inherit pkgs packages;
          };
          devShells = import ./nix/shells.nix {
            inherit pkgs env packages;
            shellHook = checks.pre-commit-check.shellHook;
          };
          checks = {
            pre-commit-check = pre-commit;
            format = formatter;
          };
        };
        {
          inherit checks formatter packages devShells;
        }
      )
    )
  ;

}
