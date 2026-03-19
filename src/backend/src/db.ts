type User = {
  id: number
  email: string
  name?: string
  googleId?: string
  image?: string
}

let users: User[] = []
let idCounter = 1

export const db = {
  user: {
    async findUnique({ where: { email } }: any) {
      return users.find(u => u.email === email) || null
    },

    async create({ data }: any) {
      const user = {
        id: idCounter++,
        ...data
      }

      users.push(user)
      return user
    }
  }
}