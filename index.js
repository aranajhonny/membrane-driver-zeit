import { client, get, post, del, put } from './client'
import { parse as parseUrl } from 'url'

const { TOKEN } = process.env;

const { root } = program.refs

export async function init() {
  await root.set({
    deployments: {},
    teams: {},
    aliases: {},
    domains: {},
    dns: {},
    certificates: {},
    // instances: {},
  })
}

export async function test({ name }) {
  switch (name) {
    case 'access': {
      if (!TOKEN) {
        return false;
      }
      try {
        const res = await client.get(`/v2/now/deployments`)
        return res && res.status === 200;
      } catch (e) {
        return false;
      }
      break;
    }
  }
  return false;
}


export async function parse({ name, value }) {
  console.log('Parsing', name, value)
  switch (name) {
    case 'url': {
      let uid = ''
      let teamId = ''

      const res = await get(`/v2/now/deployments`)
      const dep = res.deployments.find(d => d.url === value)
      if (dep) {
        uid = dep.uid
        return root.deployments.one({ uid: uid })
      }

      if (!uid) {
        const res = await get(`/teams/`)
        await Promise.all(
          res.teams.map(async team => {
            const result = await get(`/v2/now/deployments?teamId=${team.id}`)
            const depT = result.deployments.find(d => d.url === value)
            if (depT) {
              uid = depT.uid
              teamId = team.id
            }
          })
        )
      }
      return root.teams
        .one({ id: teamId })
        .deployments()
        .one({ uid: uid })
      break
    }
  }
}

export const DeploymentCollection = {
  async one({ args, self }) {
    const { id: teamId } = self.match(root.teams.one())
    if (teamId) {
      const result = await get(
        `/v2/now/deployments/${args.uid}?teamId=${teamId}`
      )
      return result
    } else {
      const result = await get(`/v2/now/deployments/${args.uid}`)
      return result
    }
  },
  async items({ args, self }) {
    const { id: teamId } = self.match(root.teams.one())
    if (teamId) {
      const result = await get(`/v2/now/deployments?teamId=${teamId}`)
      return result.deployments
    } else {
      const result = await get(`/v2/now/deployments/`)
      return result.deployments
    }
  },
}

export let DeploymentItem = {
  self({ source, self, parent }) {
    const { uid } = source
    if (uid === undefined || uid === null) {
      return null
    }
    return parent.parent.one({ uid: source.uid })
  },
}

export const Deployment = {
  async setAlias({ self, args }) {
    const { uid } = self.match(root.deployments.one())
    if (uid === undefined || uid === null) {
      return null
    }
    const result = await post(`/v2/now/deployments/${uid}/aliases`, {
      alias: args.alias,
    })
    if (result.status === 200) {
      return 'Success!'
    }
  },
  async setScaleConfiguration({ self, args }) {
    const { uid } = self.match(root.deployments.one())
    if (uid === undefined || uid === null) {
      return null
    }
    const result = await post(`/v1/now/deployments/${uid}/instances`, {
      min: args.min,
      max: args.max,
    })
  },
  async aliases({ source }) {
    const { uid } = source
    if (uid === undefined || uid === null) {
      return null
    }
    const result = await get(`/v2/now/deployments/${uid}/aliases`)
    return result.aliases
  },

  async self({ source }) {
    return root.deployments.one({ uid: source.uid })
  },
  instances() {
    return {}
  },
}

export const AliasCollection = {
  async one({ args }) {
    const result = await get(`/v2/now/aliases/`)
    const alias = result.aliases.find(one => one.uid === args.uid)
    return alias
  },
  async items() {
    const result = await get(`/v2/now/aliases/`)
    return result.aliases
  },
}

export const Alias = {
  async self({ source }) {
    return root.aliases.one({ uid: source.uid })
  },
}

// export const InstanceCollection = {
//   async one({ args, self }) {
//     const { uid } = self.match(root.deployments.one())
//     const instanceId = args.uid
//     result = await get(`/v1/now/deployments/${uid}/instances`)
//     const instance = result.instances.find(
//       (instance) => instance.uid === instanceId,
//     )
//     return instance
//   },
//   async items({ self }) {
//     const { uid } = self.match(root.deployments.one())
//     const result = await get(`/v1/now/deployments/${uid}/instances`)
//     console.log(result)
//     return result.instances
//   },
// }

// export const Instance = {
//   async self({ source }) {
//     return root.instances.one({ uid: source.uid })
//   },
// }

export const TeamCollection = {
  async one({ args }) {
    const result = await get(`/teams/${args.id}`)
    return result
  },
  async items() {
    const result = await get(`/teams/`)
    return result.teams
  },
}

export const Team = {
  async self({ source }) {
    return root.teams.one({ id: source.id })
  },
  deployments() {
    return {}
  },
}

export const DomainCollection = {
  async one({ args }) {
    const result = await get(`/v2/domains`)
    const domain = result.domains.find(one => one.uid === args.uid)
    return domain
  },
  async items() {
    const result = await get(`/v2/domains`)
    return result.domains
  },
  async createDomain({ args }) {
    const result = await post(`/v2/domains`, {
      name: args.name,
      isExternal: args.isExternal,
    })
    if (result.status === 200) {
      return 'Success!'
    }
  },
  async checkDomain({ args }) {
    const result = await get(`/v2/domains/status?name=${args.name}`)
    return result
  },
  async checkPrice({ args }) {
    const result = await get(`/v2/domains/price?name=${args.name}`)
    return result
  },
  async deleteDomain({ args }) {
    const result = await del(`/v2/domains/${args.name}`)
    if (result.status === 200) {
      return 'Success!'
    }
  },
}

export const Domain = {
  async self({ source }) {
    return root.domains.one({ uid: source.uid })
  },
  async createDns({ self, args }) {
    const { name } = self.match(root.domains.one())
    const result = await post(`/v2/now/deployments/${name}/aliases`, {
      name: args.name,
      type: args.type,
      value: args.value,
    })
    if (result.status === 200) {
      return 'Success!'
    }
  },
  async deleteDns({ self, args }) {
    const { name } = self.match(root.domains.one())
    const result = await del(`/v2/domains/${source.name}/records/${args.id}`)
    if (result.status === 200) {
      return 'Success!'
    }
  },
}

export const DnsCollection = {
  async one({ self, args }) {
    const { name: dName } = self.match(root.domains.one())
    const name = dName ? dName : args.name
    const result = await get(`/v2/domains/${name}/records`)
    const dns = result.records.find(one => one.id === args.id)
    return dns
  },
  async items({ self, args }) {
    const { name: dName } = self.match(root.domains.one())
    const name = dName ? dName : args.name
    const result = await get(`/v2/domains/${name}/records`)
    return result.records
  },
}

export const Dns = {
  async self({ source }) {
    return root.dns.one({ id: source.id })
  },
}

export const CertificateCollection = {
  async one({ args }) {
    result = await get(`/v2/now/certs/${cn}`)
  },
  async items() {
    const result = await get('/v2/now/certs')
    return result.certs
  },
  async createCertificate({ args }) {
    const result = await post('/v2/now/certs', {
      domains: args.domains,
      renew: args.renew,
    })
    if (result.status === 200) {
      return 'Success!'
    }
  },
  async replaceCertificate({ args }) {
    const result = await put('/v2/now/certs', {
      domains: args.domains,
      ca: args.ca,
      cert: args.cert,
      key: args.key,
    })
    if (result.status === 200) {
      return 'Success!'
    }
  },
  async deleteCertificate({ args }) {
    const result = await del(`/v2/now/certs/${args.name}`)
    if (result.status === 200) {
      return 'Success!'
    }
  },
}

export const Certificate = {
  async self({ source }) {
    return root.certificates.one({ uid: source.uid })
  },
}
