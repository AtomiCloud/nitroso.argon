{ pkgs, pkgs-2305, atomi, atomi_classic, pkgs-dec-26-23 }:
let

  all = {
    atomipkgs_classic = (
      with atomi_classic;
      {
        inherit
          sg;
      }
    );
    atomipkgs = (
      with atomi;
      {
        inherit
          mirrord
          swagger_typescript_api
          infisical
          pls;
      }
    );
    nix-2305 = (
      with pkgs-2305;
      { }
    );
    dec-26-23 = (
      with pkgs-dec-26-23;
      {
        nodejs = nodejs_20;
        npm = nodePackages.npm;
        helm = kubernetes-helm;
        inherit
          coreutils
          yq-go
          gnused
          gnugrep
          bash
          jq
          findutils
          doppler

          git

          bun
          treefmt
          gitlint
          shellcheck
          skopeo

          # infra
          k3d
          kubectl
          ;
      }
    );
  };
in
with all;
nix-2305 //
atomipkgs //
atomipkgs_classic //
dec-26-23
