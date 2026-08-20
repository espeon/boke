---
title: "Setting up my own Streamplace server"
description: "In and out, quick hour-long adventure, right?"
date: "Jul 15 2025"
---

## Part 1: An Unexpected Journey

### Comfortable Routines

Ever since I started working with [Eli](https://bsky.app/profile/iame.li) at Streamplace, my days have settled into a comfortable routine. I would wake up, brew a cup of coffee. I had my routines. Working on issues, writing code, and making PRs became almost second nature. Working on new features, I got more and more familiar with the codebase.  I would sometimes find myself lost, working later than usual into the night, excited for a new feature I was building. The Streamplace platform was becoming a large part of my week (in no small part due to me working there), but also because I genuinely enjoyed the work. Eli is great, the code was interesting, and the platform itself was a joy to use. It had its quirks and features, sure, but it was a solid platform built on a solid foundation that I'm proud to be a part of.

But, as most anyone would tell you, comfort has a way of breeding curiosity. The more I worked with this codebase, the more I found myself wondering about deployment and server management. I had always been fascinated by the idea of running apps on my own servers, but somehow I have never really thought about it for Streamplace. So, I thought: What would it be like to run my own Streamplace server? What would the setup process look like? What challenges would I face? How would the setup process actually work? There was only one way to find out.

The moment of decision was when Eli mentioned his vision for Streamplace, which is to one day be an Internected platform anyone can host, syndicate from, and build their own communities on. I was intrigued. So, I decided to take the plunge and set up my own Streamplace server.

### Packing Provisions

What does one pack for a journey like this? Not much, at least physically. I had my laptop, an internet connection, and a credit card. But mentally, I needed patience, a willingness to learn, and documentation. Unfortunately, I didn't have much of the latter, so I decided to document my journey as I went along. I wanted to share my experience, the challenges I faced, and the solutions I found. I hoped that this would not only help me remember the process but also assist anyone else who might want to embark on a similar journey.

So, what would one need for a setup like mine?
- A server: I chose an [Advin Servers](https://www.advinservers.com/) VPS with Rocky Linux 9.2. It was the most bang-for-your-buck option I could find, and I was excited to try out a new, secure, distro.
- Docker knowledge: I had some experience with Docker, but I wouldn't consider myself an expert. I knew enough to get by.
- A domain name: I registered a domain name with [Spaceship](https://www.spaceship.com/) (Richard Kirkendall's new project). Usually I use Porkbun, but right now [i'm a Saving Guy](https://twiiit.com/jamescagewhite/status/1271243561799843842) and Spaceship had $0.99 .space domains.
- A backup plan for if anything went wrong
- Most importantly, realistic expectations. This is a learning experience, and I knew that I would face bumps along the way. I was ready to embrace them.

### Setting Off
With my provisions packed, I was ready to set off on my journey. I had a rough idea of what I needed to do, but I knew that the details would come as I went along. The first step was to get my server up and running. I logged into my Advin Servers account, created a new VPS instance, and installed Rocky Linux 9.2 and Docker. The process was straightforward, and before I knew it, I had a fresh server ready for action.

## Part 2: There and Back Again

### The First Steps
The first step was to get Docker installed on my server. I followed the official [Docker installation guide](https://docs.docker.com/engine/install/rocky/) for Rocky Linux, and it went fairly smoothly. Rocky Linux is fairly new, so I had to install it manually and not via the setup script. If you tend to use Ubuntu, that may be an easier option. Once Docker was installed, I started the Docker service and enabled it to start on boot. I also added my user to the Docker group so I could run Docker commands without using `sudo`. This was a good start, but I knew that I had a long way to go.

See, I knew that Streamplace doesn't use docker for deployment - internally we use a systemd service on a dedicated server. I wanted to use Docker for my own purposes, and to have it along with a bunch of other services that I wanted to run.

Thus, I needed to write my own Dockerfile for Streamplace. I started with a simple Dockerfile that copied the code into a small Debian image and installed the necessary dependencies.

```dockerfile
FROM debian:bookworm-slim

# install updated TLS certs
RUN apt-get update && \
    apt-get install -y \
    wget \
    ca-certificates

# download and extract the proper Streamplace binary
RUN wget -qO- https://git-cloudflare.stream.place/api/v4/projects/1/packages/generic/latest/v0.7.2/streamplace-v0.7.2-linux-amd64.tar.gz | tar xvz -C /app

WORKDIR /app

# it's compiled statically, so no deps needed in this codebase

# expose the port that Streamplace listens on
EXPOSE 38080

# run the Streamplace binary
CMD ["./streamplace"]
```

Now for the compose.yml:

```yaml
services:
  streamplace:
    build: .
    image: sp-server:latest
    container_name: streamplace
    volumes:
      - ./data:/var/lib/streamplace
    ports:
      - "38080:38080"
    command: >
      ./streamplace
      --public-host=kleinevis.space
      --app-bundle-id=tv.aquareum
      --rate-limit-per-second=10
      --rate-limit-burst=20
      --rtmp-server-addon=mistserver:31935
      --http-internal-addr=0.0.0.0:39090
      # add other flags here as needed
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.streamplace.rule=Host(`kleinevis.space`)"
      - "traefik.http.routers.streamplace.entrypoints=websecure"
      - "traefik.http.services.streamplace.loadbalancer.server.port=38080"
      - "traefik.http.routers.streamplace.tls=true"
      - "traefik.http.routers.streamplace.tls.certresolver=myresolver"
    networks:
      - traefik_proxy
      - default

networks:
  traefik_proxy:
    external: true
    name: traefik_proxy
  default:
    driver: bridge
```

I already have a router (traefik in this instance) on this machine, so I just hooked it up with that.

I wanted RTMP, so I also set up Mistserver, which is a great RTMP server that works well with Streamplace. I wrote a simple Dockerfile for it as well:

```yml
# services:
# add this file under services
  mistserver:
    image: dist.stream.place/streamplace/streamplace:latest-mistserver
    container_name: mistserver
    shm_size: 512m
    ports:
      - "1935:31935"
      - "28080:28080"
    volumes:
      - ./mistserver:/var/lib/mistserver
    environment:
      - MISTSERVER_ADMIN_PASSWORD=yourpassword
    networks:
      - traefik_proxy
```

That shm_size is important, more on it later.

Anyways, with my Dockerfiles and compose.yml ready, I ran `docker-compose up -d` to start the Streamplace server. The first run was a bit nerve-wracking. Would it work? Would I have to debug for hours? But to my surprise, everything started up reasonably smoothly, as well as one could hope. The Streamplace server was running, and I could access it via my domain name. Good enough for now.

### Riddles in the Dark

But, there was one small problem. There was a nagging warning in the mistserver logs about the `shm_size` being too small. I had set it to the default for Docker (64mb), but it wasn't enough for mistserver. It looks like the recommended option is to set it to 95% of your total available memory, so that's what I did. I stopped the container, set the `shm_size` to 512mb, and started it again. The warning was gone, and everything seemed to be working fine.

But, as I was testing the server, I noticed that if I ran traefik with all the rest of my apps, Streamplace would gateway timeout, but by itself it wouldn't.

I was confused. I'm sure I set up the labels correctly. I checked the dashboard and logs, and everything seemed fine. I tried restarting the container, but it didn't help.

I tried everyting. Setting ports, labels, and even different domain names. Safe to say, here, I was  completely stumped.

I tried looking at other, similar situations I've been through. And there it was.

Turns out, I forgot to set the network Traefik uses to `traefik_proxy` in the compose.yml. Traefik detects the service fine, but it can't connect to it because it's not on the same network. I added the `traefik_proxy` network to the service, and everything started working again. Silly mistake, but it happens to the best of us.

I breathed a sigh of relief. The Streamplace server was up and running, and I could access it via my domain name. I could even stream video to it using WebRTC. I was thrilled.

### The Mines

But, RTMP didn't seem to work. I tried streaming to it with OBS, but it didn't seem to work. Logs? Nothing.

Then I looked at the Live Dashboard. There it was: `rtmps://`. Time to go back into the mines. It's time to set up TLS certificates.

I had set up the `SP_RTMP_SERVER_ADDON` environment variable correctly, but I hadn't set up the TLS certificates for RTMP. I needed to set up a certificate resolver in Traefik to handle the TLS certificates for RTMP.

Simple enough, I thought. Just add a new RTMPS entrypoint, and use that in the service labels.

Simple. Right.

Nothing's ever this simple. Again, I tried everything. I set up the entrypoint, added the labels, and restarted the container. But it still didn't work. Confused again. Hours spent over something that should have been easy.

### The Ring
I then decided to change my perspective. The Docker networking issues were becoming more complex than I wanted to deal with, and I realized I was fighting against the tools rather than working with them. Sometimes the best solution is to step back and try a different approach. This is what I ended up doing:

- Streamplace as a systemd service on the host (simple, direct)
- Caddy in Docker for reverse proxy and TLS (because Caddy + Docker + Let's Encrypt is just too convenient)
- Mistserver in Docker (because it was already working)

This gave me the best of both worlds. The Caddyfile is beautifully simple:

```nginx
stream.example.com {
        tls {
             dns cloudflare {env.CLOUDFLARE_API_TOKEN}
        }
        handle {
                reverse_proxy https://host.docker.internal:38443 {
                    # skip TLS certs b/c the Streamplace server serves certs for host domain
                    # may be insecure? revisit eventually
         			transport http {
            				tls_insecure_skip_verify
         			}
      		}
        }
```

I used host.docker.internal to let the Caddy container communicate with the Streamplace service outside of Docker. Sometimes the simplest solution is mixing approaches instead of using one solution for everything.

The service file is quite reasonable too:
```ini
[Unit]
Description=Streamplace, the Video Layer for Everything
Documentation=https://stream.place/docs
After=network.target

[Service]
Type=simple
Environment=HOME=%h
Environment=GOMEMLIMIT=3GiB
Environment=GOGC=70
MemoryMax=2G
Restart=always
RestartSec=1s

ExecStart=/usr/bin/streamplace \
    --secure \
    --app-bundle-id=tv.aquareum \
    --rate-limit-per-second 0 \
    --rate-limit-burst 0 \
    --public-host your-host \
    --http-internal-addr=0.0.0.0:39090 \
    --rtmp-server-addon=127.0.0.1:31935

[Install]
WantedBy=multi-user.target
```

The only difficult part was building the Caddy container (for Cloudflare DNS-01), and the mistserver container for RTMP.

"IT WORKED", I exclaimed. In my head.

Everything worked!

Everything worked, except for RTMP. I racked my brain. Again. Until I saw this in the code:

```go
func Live(streamKey string) error {
	// Create the URL for the live stream endpoint
	url := fmt.Sprintf("http://127.0.0.1:39090/live/%s", streamKey)
```

Oh. That's not going to work. That needs to be configurable. I'm not running everything in the same container, so I can't just use a loopback IP here.

So, I made a PR to reuse the `--http-internal-addr` flag to set an address for the internal API. This way, I could set it to the correct address for my setup. Now to just wait until it gets merged.

In the interim, I switched to the binaries on that specific branch. I built the binary with the `--http-internal-addr` flag set to the correct address for my setup, and everything started working again. I could stream to the RTMP server, and everything just worked. I was relieved. I had finally set up my own Streamplace server, and it was finally working as expected.

This is the resulting Dockerfile:
```dockerfile
ARG TARGETARCH
FROM --platform=linux/$TARGETARCH ubuntu:24.04

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    tar \
    gzip \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Download and install Streamplace binary
ARG STREAMPLACE_URL
# TODO: Replace with updated URL once PR merged
ENV STREAMPLACE_URL=https://git-cloudflare.stream.place/streamplace/streamplace/-/package_files/18877/download
RUN curl -L "$STREAMPLACE_URL" | tar xzv; \

# Download and install MistServer
RUN echo "Installing MistServer..." && \
    curl -o - https://releases.mistserver.org/is/mistserver_64V3.6.1.tar.gz 2>/dev/null | sh

# Create config directory
RUN mkdir -p /config

# Copy configuration file
COPY mistserver.json /config/mistserver.json

# Expose ports
EXPOSE 28080 31935

# Set working directory
WORKDIR /config

# Start MistController with configuration
CMD ["MistController", "-c", "/config/mistserver.json"]
```

Now that it worked, the next step was to lock down the server. I wanted to make sure that only I could access it, so I set up a firewall and blocked all incoming traffic except for the ports I needed. I also set up Tailscale to access the server remotely, just to be safe. All simple but necessary steps.

## Part 3: The Return of the King

### The Journey's End

With the server up and running, I could finally take a step back and appreciate the journey I had taken. It was a learning experience, to say the least. I had faced challenges, made mistakes, and learned quite a lot along the way. I had set up my own Streamplace server, although not in the way I intended, but it was working as expected.

I found myself back in familiar territory with the familiar Streamplace UI I helped develop, but running on my own server. I could stream video and chat, the same as on the official instance. I could even use the RTMP server to stream video from OBS! I was thrilled. I finally had my own self-hosted little corner of Streamplace, all to myself. Running the platform I helped build, under my complete control.

### The Shire Has Changed

Maybe it was me that changed. Everything I built now carried additional weight. When I wrote code, I hadn't fully internalized all the effects that it could have, from ux, to devex, to deployment and ops. How could this affect someone setting up their own Streamplace node? What would they want to make the process easier or more configurable?

### There and Back Again

Would I do it again? Yes, especially now that I know what to do. The satisfaction of actually seeing something you helped create, running on your own server, is pretty hard to describe. It's like seeing a article you had a hand in writing finally published.

To anyone else: The path isn't necessarily easy, but it's a lot simpler than one may think. The documentation isn't as good as it could be (if you want to, feel free to PR!), but it's still workable. And when you finally get it working, streaming video, and handling all the protocols like a champion. Well, that's when you'll understand why some of us can't help but tinker with servers in our spare time.

The Shire is always there when you return, but you'll never see it quite the same way again. And that, fellow adventurers, is the real treasure.

Find the code for this on my [GitHub](https://github.com/espeon/sp-selfhost).
